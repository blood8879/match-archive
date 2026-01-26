"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  TeamMergeRequestWithDetails,
  TeamMergeMappingWithDetails,
  TeamSearchResult,
  MatchSearchResult,
  CreateMergeRequestInput,
  SubmitDisputeScoreResult,
  ProcessTeamMergeResult,
  MatchConflictType,
} from "@/types/team-merge";

export async function searchTeamByCode(teamCode: string) {
  const supabase = await createClient();

  const { data: team, error } = await supabase
    .from("teams")
    .select("id, name, emblem_url, code, region")
    .eq("code", teamCode.toUpperCase())
    .single();

  if (error || !team) {
    return null;
  }

  return team;
}

export async function findRelatedMatches(
  myTeamId: string,
  targetTeamId: string,
  targetTeamName: string
): Promise<TeamSearchResult | null> {
  const supabase = await createClient();

  const { data: targetTeam } = await supabase
    .from("teams")
    .select("id, name, emblem_url, code, region")
    .eq("id", targetTeamId)
    .single();

  if (!targetTeam) return null;

  const { data: myTeam } = await supabase
    .from("teams")
    .select("name")
    .eq("id", myTeamId)
    .single();

  if (!myTeam) return null;

  const relatedMatches: MatchSearchResult[] = [];
  let alreadyMergedCount = 0;

  const { data: myMatchesWithGuest } = await supabase
    .from("matches")
    .select("*")
    .eq("team_id", myTeamId)
    .or(
      `opponent_name.ilike.%${targetTeamName}%,opponent_team_id.eq.${targetTeamId}`
    )
    .order("match_date", { ascending: false });

  const { data: myGuestTeams } = await supabase
    .from("guest_teams")
    .select("id, name")
    .eq("team_id", myTeamId)
    .ilike("name", `%${targetTeamName}%`);

  let guestTeamMatches: typeof myMatchesWithGuest = [];
  if (myGuestTeams && myGuestTeams.length > 0) {
    const guestTeamIds = myGuestTeams.map((g) => g.id);
    const { data } = await supabase
      .from("matches")
      .select("*")
      .eq("team_id", myTeamId)
      .in("guest_team_id", guestTeamIds)
      .order("match_date", { ascending: false });
    guestTeamMatches = data || [];
  }

  const allMyMatches = [
    ...(myMatchesWithGuest || []),
    ...(guestTeamMatches || []),
  ];
  const uniqueMyMatches = Array.from(
    new Map(allMyMatches.map((m) => [m.id, m])).values()
  );

  const { data: targetMatches } = await supabase
    .from("matches")
    .select("*")
    .eq("team_id", targetTeamId)
    .or(`opponent_name.ilike.%${myTeam.name}%,opponent_team_id.eq.${myTeamId}`)
    .order("match_date", { ascending: false });

  for (const match of uniqueMyMatches) {
    if (match.linked_match_id || match.source_type === "merged") {
      alreadyMergedCount++;
      continue;
    }

    const matchDate = new Date(match.match_date).toDateString();
    const conflictingMatch = targetMatches?.find((tm) => {
      if (tm.linked_match_id || tm.source_type === "merged") return false;
      return new Date(tm.match_date).toDateString() === matchDate;
    });

    let conflictType: MatchConflictType = "no_conflict";

    if (conflictingMatch) {
      const scoresMatch =
        match.home_score === conflictingMatch.away_score &&
        match.away_score === conflictingMatch.home_score;

      conflictType = scoresMatch ? "score_match" : "score_mismatch";
    }

    relatedMatches.push({
      match,
      source_team: "requester",
      conflict_type: conflictType,
      conflicting_match: conflictingMatch || null,
      is_home: match.is_home ?? true,
    });
  }

  for (const match of targetMatches || []) {
    if (match.linked_match_id || match.source_type === "merged") {
      alreadyMergedCount++;
      continue;
    }

    const matchDate = new Date(match.match_date).toDateString();
    const alreadyIncluded = relatedMatches.some(
      (rm) => new Date(rm.match.match_date).toDateString() === matchDate
    );

    if (!alreadyIncluded) {
      relatedMatches.push({
        match,
        source_team: "target",
        conflict_type: "no_conflict",
        conflicting_match: null,
        is_home: match.is_home ?? true,
      });
    }
  }

  return {
    team: targetTeam,
    related_matches: relatedMatches,
    total_matches: relatedMatches.length,
    conflicting_matches: relatedMatches.filter(
      (m) => m.conflict_type === "score_mismatch"
    ).length,
    already_merged_matches: alreadyMergedCount,
  };
}

export async function createTeamMergeRequest(
  myTeamId: string,
  input: CreateMergeRequestInput
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "로그인이 필요합니다" };
  }

  const { data: myMembership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", myTeamId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!myMembership || !["OWNER", "MANAGER"].includes(myMembership.role)) {
    return { success: false, error: "팀 관리자만 병합 요청을 생성할 수 있습니다" };
  }

  const hasDispute = input.mappings.some((m) => m.mapping_type === "dispute");

  const { data: mergeRequest, error: requestError } = await supabase
    .from("team_merge_requests")
    .insert({
      requester_team_id: myTeamId,
      requester_user_id: user.id,
      target_team_id: input.target_team_id,
      guest_team_id: input.guest_team_id || null,
      status: hasDispute ? "dispute" : "pending",
    })
    .select("id")
    .single();

  if (requestError || !mergeRequest) {
    console.error("[createTeamMergeRequest] Error:", requestError);
    if (requestError?.message?.includes("unique")) {
      return { success: false, error: "이미 해당 팀과의 병합 요청이 존재합니다" };
    }
    return { success: false, error: "병합 요청 생성에 실패했습니다" };
  }

  for (const mapping of input.mappings) {
    const { data: mappingData, error: mappingError } = await supabase
      .from("team_merge_match_mappings")
      .insert({
        merge_request_id: mergeRequest.id,
        source_match_id: mapping.source_match_id,
        source_team_id: mapping.source_team_id,
        mapping_type: mapping.mapping_type,
        existing_match_id: mapping.existing_match_id || null,
        status: mapping.mapping_type === "dispute" ? "dispute" : "pending",
      })
      .select("id")
      .single();

    if (mappingError) {
      console.error("[createTeamMergeRequest] Mapping error:", mappingError);
      continue;
    }

    if (mapping.mapping_type === "dispute" && mappingData) {
      const { data: sourceMatch } = await supabase
        .from("matches")
        .select("home_score, away_score")
        .eq("id", mapping.source_match_id)
        .single();

      let targetScore = null;
      if (mapping.existing_match_id) {
        const { data } = await supabase
          .from("matches")
          .select("home_score, away_score")
          .eq("id", mapping.existing_match_id)
          .single();
        targetScore = data;
      }

      await supabase.from("team_merge_disputes").insert({
        mapping_id: mappingData.id,
        requester_home_score: sourceMatch?.home_score ?? 0,
        requester_away_score: sourceMatch?.away_score ?? 0,
        target_home_score: targetScore?.home_score ?? null,
        target_away_score: targetScore?.away_score ?? null,
      });
    }
  }

  await notifyTeamManagers(input.target_team_id, "team_merge_request", {
    merge_request_id: mergeRequest.id,
    requester_team_id: myTeamId,
  });

  revalidatePath(`/teams/${myTeamId}`);
  revalidatePath(`/teams/${input.target_team_id}`);

  return { success: true, requestId: mergeRequest.id };
}

export async function getTeamMergeRequests(
  teamId: string,
  type: "incoming" | "outgoing" | "all" = "all"
): Promise<TeamMergeRequestWithDetails[]> {
  const supabase = await createClient();

  let query = supabase
    .from("team_merge_requests")
    .select(
      `
      *,
      requester_team:teams!team_merge_requests_requester_team_id_fkey(id, name, emblem_url),
      target_team:teams!team_merge_requests_target_team_id_fkey(id, name, emblem_url),
      guest_team:guest_teams(id, name),
      requester_user:users!team_merge_requests_requester_user_id_fkey(id, nickname, avatar_url),
      approver_user:users!team_merge_requests_approver_user_id_fkey(id, nickname, avatar_url)
    `
    )
    .order("created_at", { ascending: false });

  if (type === "incoming") {
    query = query.eq("target_team_id", teamId);
  } else if (type === "outgoing") {
    query = query.eq("requester_team_id", teamId);
  } else {
    query = query.or(
      `requester_team_id.eq.${teamId},target_team_id.eq.${teamId}`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getTeamMergeRequests] Error:", error);
    return [];
  }

  return (data || []) as unknown as TeamMergeRequestWithDetails[];
}

export async function getMergeRequestDetails(
  requestId: string
): Promise<{
  request: TeamMergeRequestWithDetails;
  mappings: TeamMergeMappingWithDetails[];
} | null> {
  const supabase = await createClient();

  const { data: request, error: requestError } = await supabase
    .from("team_merge_requests")
    .select(
      `
      *,
      requester_team:teams!team_merge_requests_requester_team_id_fkey(id, name, emblem_url),
      target_team:teams!team_merge_requests_target_team_id_fkey(id, name, emblem_url),
      guest_team:guest_teams(id, name),
      requester_user:users!team_merge_requests_requester_user_id_fkey(id, nickname, avatar_url),
      approver_user:users!team_merge_requests_approver_user_id_fkey(id, nickname, avatar_url)
    `
    )
    .eq("id", requestId)
    .single();

  if (requestError || !request) {
    return null;
  }

  const { data: mappings } = await supabase
    .from("team_merge_match_mappings")
    .select(
      `
      *,
      source_match:matches!team_merge_match_mappings_source_match_id_fkey(*),
      existing_match:matches!team_merge_match_mappings_existing_match_id_fkey(*),
      created_match:matches!team_merge_match_mappings_created_match_id_fkey(*),
      dispute:team_merge_disputes(*)
    `
    )
    .eq("merge_request_id", requestId)
    .order("created_at", { ascending: true });

  return {
    request: request as unknown as TeamMergeRequestWithDetails,
    mappings: (mappings || []) as unknown as TeamMergeMappingWithDetails[],
  };
}

export async function submitDisputeScore(
  disputeId: string,
  homeScore: number,
  awayScore: number
): Promise<SubmitDisputeScoreResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "로그인이 필요합니다" };
  }

  const { data, error } = await supabase.rpc("submit_dispute_score", {
    p_dispute_id: disputeId,
    p_user_id: user.id,
    p_home_score: homeScore,
    p_away_score: awayScore,
  });

  if (error) {
    console.error("[submitDisputeScore] Error:", error);
    return { success: false, error: error.message };
  }

  const result = data as SubmitDisputeScoreResult;

  if (result.resolved) {
    const { data: dispute } = await supabase
      .from("team_merge_disputes")
      .select("mapping:team_merge_match_mappings(merge_request_id)")
      .eq("id", disputeId)
      .single();

    if (dispute?.mapping) {
      const mergeRequestId = (dispute.mapping as { merge_request_id: string })
        .merge_request_id;
      revalidatePath(`/teams`);

      const { data: request } = await supabase
        .from("team_merge_requests")
        .select("requester_team_id, target_team_id")
        .eq("id", mergeRequestId)
        .single();

      if (request) {
        await notifyTeamManagers(request.requester_team_id, "team_merge_resolved", {
          merge_request_id: mergeRequestId,
          dispute_id: disputeId,
        });
        await notifyTeamManagers(request.target_team_id, "team_merge_resolved", {
          merge_request_id: mergeRequestId,
          dispute_id: disputeId,
        });
      }
    }
  }

  return result;
}

export async function approveTeamMerge(
  requestId: string
): Promise<ProcessTeamMergeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "로그인이 필요합니다" };
  }

  const { data, error } = await supabase.rpc("process_team_merge", {
    p_request_id: requestId,
    p_approver_id: user.id,
  });

  if (error) {
    console.error("[approveTeamMerge] Error:", error);
    return { success: false, error: error.message };
  }

  const result = data as ProcessTeamMergeResult;

  if (result.success) {
    const { data: request } = await supabase
      .from("team_merge_requests")
      .select("requester_team_id, target_team_id")
      .eq("id", requestId)
      .single();

    if (request) {
      await notifyTeamManagers(request.requester_team_id, "team_merge_approved", {
        merge_request_id: requestId,
        matches_created: result.matches_created,
        matches_linked: result.matches_linked,
      });

      revalidatePath(`/teams/${request.requester_team_id}`);
      revalidatePath(`/teams/${request.target_team_id}`);
    }
  }

  return result;
}

export async function rejectTeamMerge(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "로그인이 필요합니다" };
  }

  const { data: request } = await supabase
    .from("team_merge_requests")
    .select("target_team_id, requester_team_id")
    .eq("id", requestId)
    .single();

  if (!request) {
    return { success: false, error: "요청을 찾을 수 없습니다" };
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", request.target_team_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!membership || !["OWNER", "MANAGER"].includes(membership.role)) {
    return { success: false, error: "권한이 없습니다" };
  }

  const { error } = await supabase
    .from("team_merge_requests")
    .update({ status: "rejected", processed_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) {
    return { success: false, error: "거절 처리에 실패했습니다" };
  }

  await notifyTeamManagers(request.requester_team_id, "team_merge_rejected", {
    merge_request_id: requestId,
  });

  revalidatePath(`/teams/${request.requester_team_id}`);
  revalidatePath(`/teams/${request.target_team_id}`);

  return { success: true };
}

export async function cancelTeamMerge(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "로그인이 필요합니다" };
  }

  const { data: request } = await supabase
    .from("team_merge_requests")
    .select("requester_team_id, target_team_id")
    .eq("id", requestId)
    .single();

  if (!request) {
    return { success: false, error: "요청을 찾을 수 없습니다" };
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", request.requester_team_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!membership || !["OWNER", "MANAGER"].includes(membership.role)) {
    return { success: false, error: "권한이 없습니다" };
  }

  const { error } = await supabase
    .from("team_merge_requests")
    .update({ status: "cancelled", processed_at: new Date().toISOString() })
    .eq("id", requestId)
    .in("status", ["pending", "dispute"]);

  if (error) {
    return { success: false, error: "취소 처리에 실패했습니다" };
  }

  revalidatePath(`/teams/${request.requester_team_id}`);
  revalidatePath(`/teams/${request.target_team_id}`);

  return { success: true };
}

export async function getMyPendingDisputes(): Promise<
  Array<{
    dispute_id: string;
    match_date: string;
    requester_team_name: string;
    target_team_name: string;
    requester_score: string;
    target_score: string;
    my_role: "requester" | "target";
    has_submitted: boolean;
  }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: myTeams } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("role", ["OWNER", "MANAGER"]);

  if (!myTeams || myTeams.length === 0) return [];

  const teamIds = myTeams.map((t) => t.team_id);

  const { data: disputes } = await supabase
    .from("team_merge_disputes")
    .select(
      `
      id,
      requester_home_score,
      requester_away_score,
      target_home_score,
      target_away_score,
      requester_submitted_home,
      target_submitted_home,
      mapping:team_merge_match_mappings(
        source_match:matches!team_merge_match_mappings_source_match_id_fkey(match_date),
        merge_request:team_merge_requests(
          requester_team_id,
          target_team_id,
          requester_team:teams!team_merge_requests_requester_team_id_fkey(name),
          target_team:teams!team_merge_requests_target_team_id_fkey(name)
        )
      )
    `
    )
    .eq("status", "pending");

  if (!disputes) return [];

  return disputes
    .filter((d) => {
      const req = (d.mapping as { merge_request: { requester_team_id: string; target_team_id: string } })?.merge_request;
      return (
        req &&
        (teamIds.includes(req.requester_team_id) ||
          teamIds.includes(req.target_team_id))
      );
    })
    .map((d) => {
      const mapping = d.mapping as {
        source_match: { match_date: string };
        merge_request: {
          requester_team_id: string;
          target_team_id: string;
          requester_team: { name: string };
          target_team: { name: string };
        };
      };
      const isRequester = teamIds.includes(mapping.merge_request.requester_team_id);

      return {
        dispute_id: d.id,
        match_date: mapping.source_match.match_date,
        requester_team_name: mapping.merge_request.requester_team.name,
        target_team_name: mapping.merge_request.target_team.name,
        requester_score: `${d.requester_home_score}:${d.requester_away_score}`,
        target_score:
          d.target_home_score !== null
            ? `${d.target_home_score}:${d.target_away_score}`
            : "-",
        my_role: isRequester ? "requester" : "target",
        has_submitted: isRequester
          ? d.requester_submitted_home !== null
          : d.target_submitted_home !== null,
      };
    });
}

const NOTIFICATION_MESSAGES: Record<string, { title: string; message: string }> = {
  team_merge_request: {
    title: "팀 기록 통합 요청",
    message: "다른 팀에서 경기 기록 통합을 요청했습니다.",
  },
  team_merge_dispute: {
    title: "점수 조정 필요",
    message: "경기 기록 통합 중 점수 불일치가 발견되었습니다.",
  },
  team_merge_score_submit: {
    title: "점수 제출됨",
    message: "상대팀이 점수를 제출했습니다.",
  },
  team_merge_resolved: {
    title: "점수 조정 완료",
    message: "점수 조정이 완료되었습니다.",
  },
  team_merge_approved: {
    title: "통합 승인됨",
    message: "팀 기록 통합이 승인되었습니다.",
  },
  team_merge_rejected: {
    title: "통합 거절됨",
    message: "팀 기록 통합이 거절되었습니다.",
  },
};

async function notifyTeamManagers(
  teamId: string,
  type: string,
  data: Record<string, unknown>
) {
  const supabase = await createClient();

  const { data: managers } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("team_id", teamId)
    .eq("status", "active")
    .in("role", ["OWNER", "MANAGER"]);

  if (!managers || managers.length === 0) return;

  const msgConfig = NOTIFICATION_MESSAGES[type] || {
    title: "알림",
    message: "새로운 알림이 있습니다.",
  };

  const notifications = managers
    .filter((m) => m.user_id !== null)
    .map((m) => ({
      user_id: m.user_id as string,
      type: type as import("@/types/supabase").NotificationType,
      title: msgConfig.title,
      message: msgConfig.message,
      related_team_id: teamId,
      related_team_merge_id: (data.merge_request_id as string) || null,
      related_dispute_id: (data.dispute_id as string) || null,
      metadata: data,
    }));

  if (notifications.length > 0) {
    await supabase.from("notifications").insert(notifications);
  }
}
