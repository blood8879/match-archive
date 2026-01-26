"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  RecordMergeRequestWithDetails,
  GuestMemberWithStats,
} from "@/types/supabase";
import { getUserByCode } from "./invites";

/**
 * 팀의 용병 목록 조회 (통계 포함)
 * - 아직 병합되지 않은 용병만 조회
 */
export async function getTeamGuestMembers(
  teamId: string
): Promise<GuestMemberWithStats[]> {
  const supabase = await createClient();

  // 용병 멤버 조회 (병합되지 않은 것만)
  const { data: guests, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", teamId)
    .eq("is_guest", true)
    .neq("status", "merged")
    .order("joined_at", { ascending: false });

  if (error) {
    console.error("[getTeamGuestMembers] Error:", error.message);
    throw new Error("용병 목록을 불러오는데 실패했습니다");
  }

  if (!guests || guests.length === 0) {
    return [];
  }

  // 각 용병의 통계 조회
  const guestIds = guests.map((g) => g.id);
  const { data: records } = await supabase
    .from("match_records")
    .select("team_member_id, goals, assists")
    .in("team_member_id", guestIds);

  // 통계 집계
  const statsMap = new Map<
    string,
    { matches: number; goals: number; assists: number }
  >();
  records?.forEach((r) => {
    const current = statsMap.get(r.team_member_id) || {
      matches: 0,
      goals: 0,
      assists: 0,
    };
    statsMap.set(r.team_member_id, {
      matches: current.matches + 1,
      goals: current.goals + r.goals,
      assists: current.assists + r.assists,
    });
  });

  return guests.map((guest) => {
    const stats = statsMap.get(guest.id) || { matches: 0, goals: 0, assists: 0 };
    return {
      ...guest,
      total_matches: stats.matches,
      total_goals: stats.goals,
      total_assists: stats.assists,
    } as GuestMemberWithStats;
  });
}

/**
 * 기록 병합 요청 생성
 */
export async function createRecordMergeRequest(
  teamId: string,
  guestMemberId: string,
  userCode: string
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("로그인이 필요합니다");

  // 권한 확인 (OWNER 또는 MANAGER)
  const { data: myMembership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!myMembership || !["OWNER", "MANAGER"].includes(myMembership.role)) {
    throw new Error("팀 관리자만 기록 병합 요청을 생성할 수 있습니다");
  }

  // 유저 코드로 대상 사용자 찾기
  const invitee = await getUserByCode(userCode);
  if (!invitee) {
    throw new Error("존재하지 않는 유저 코드입니다");
  }

  // 용병 멤버 정보 확인
  const { data: guestMember, error: guestError } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", guestMemberId)
    .eq("team_id", teamId)
    .eq("is_guest", true)
    .single();

  if (guestError || !guestMember) {
    throw new Error("유효하지 않은 용병 기록입니다");
  }

  if (guestMember.status === "merged") {
    throw new Error("이미 병합된 기록입니다");
  }

  // 이미 대기 중인 병합 요청이 있는지 확인
  const { data: existingRequest } = await supabase
    .from("record_merge_requests")
    .select("id, status")
    .eq("guest_member_id", guestMemberId)
    .eq("status", "pending")
    .maybeSingle();

  if (existingRequest) {
    throw new Error("이미 해당 용병에 대한 병합 요청이 대기 중입니다");
  }

  // 대상 사용자가 이미 팀 멤버인지 확인은 하지 않음
  // 병합 수락 시 팀 멤버가 아니면 자동으로 추가됨

  // 병합 요청 생성
  const { error } = await supabase.from("record_merge_requests").insert({
    team_id: teamId,
    guest_member_id: guestMemberId,
    inviter_id: user.id,
    invitee_id: invitee.id,
    status: "pending",
  });

  if (error) {
    console.error("[createRecordMergeRequest] Error:", error.message);
    if (error.message.includes("unique")) {
      throw new Error("이미 해당 사용자에게 병합 요청을 보냈습니다");
    }
    throw new Error("병합 요청 생성에 실패했습니다");
  }

  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/dashboard");
}

/**
 * 받은 기록 병합 요청 목록 조회
 */
export async function getMyMergeRequests(): Promise<
  RecordMergeRequestWithDetails[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("로그인이 필요합니다");

  const { data, error } = await supabase
    .from("record_merge_requests")
    .select(
      `
      *,
      team:teams(id, name, emblem_url),
      guest_member:team_members!record_merge_requests_guest_member_id_fkey(id, guest_name, is_guest),
      inviter:users!record_merge_requests_inviter_id_fkey(id, nickname, avatar_url),
      invitee:users!record_merge_requests_invitee_id_fkey(id, nickname, avatar_url)
    `
    )
    .eq("invitee_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getMyMergeRequests] Error:", error.message);
    throw error;
  }

  return data as unknown as RecordMergeRequestWithDetails[];
}

/**
 * 팀이 보낸 기록 병합 요청 목록 조회
 */
export async function getTeamMergeRequests(
  teamId: string
): Promise<RecordMergeRequestWithDetails[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("record_merge_requests")
    .select(
      `
      *,
      team:teams(id, name, emblem_url),
      guest_member:team_members!record_merge_requests_guest_member_id_fkey(id, guest_name, is_guest),
      inviter:users!record_merge_requests_inviter_id_fkey(id, nickname, avatar_url),
      invitee:users!record_merge_requests_invitee_id_fkey(id, nickname, avatar_url)
    `
    )
    .eq("team_id", teamId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getTeamMergeRequests] Error:", error.message);
    throw error;
  }

  return data as unknown as RecordMergeRequestWithDetails[];
}

/**
 * 용병의 기록 통계 조회 (미리보기용)
 */
export async function getGuestMemberStats(guestMemberId: string): Promise<{
  matchCount: number;
  totalGoals: number;
  totalAssists: number;
  matches: Array<{
    id: string;
    match_date: string;
    opponent_name: string;
    goals: number;
    assists: number;
  }>;
}> {
  const supabase = await createClient();

  const { data: records, error } = await supabase
    .from("match_records")
    .select(
      `
      goals,
      assists,
      match:matches(id, match_date, opponent_name)
    `
    )
    .eq("team_member_id", guestMemberId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getGuestMemberStats] Error:", error.message);
    throw new Error("기록을 불러오는데 실패했습니다");
  }

  const matches = records?.map((r: any) => ({
    id: r.match?.id,
    match_date: r.match?.match_date,
    opponent_name: r.match?.opponent_name,
    goals: r.goals,
    assists: r.assists,
  })) || [];

  return {
    matchCount: records?.length || 0,
    totalGoals: records?.reduce((sum: number, r: any) => sum + r.goals, 0) || 0,
    totalAssists: records?.reduce((sum: number, r: any) => sum + r.assists, 0) || 0,
    matches,
  };
}

/**
 * 기록 병합 요청 수락
 * - DB 함수를 호출하여 안전하게 트랜잭션 처리
 */
export async function acceptMergeRequest(requestId: string): Promise<{
  success: boolean;
  recordsUpdated?: number;
  goalsUpdated?: number;
  assistsUpdated?: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "로그인이 필요합니다" };
    }

    const { data, error } = await supabase.rpc("process_record_merge", {
      p_merge_request_id: requestId,
      p_user_id: user.id,
    });

    if (error) {
      console.error("[acceptMergeRequest] RPC Error:", error.message, error);
      return { success: false, error: `RPC 에러: ${error.message}` };
    }

    const result = data as {
      success: boolean;
      new_member_id?: string;
      records_updated?: number;
      records_merged?: number;
      goals_updated?: number;
      assists_updated?: number;
      error?: string;
      error_detail?: string;
      debug_step?: string;
    };

    console.log("[acceptMergeRequest] Result:", JSON.stringify(result));

    if (!result.success) {
      const errorMsg = result.error || "기록 병합에 실패했습니다";
      const debugInfo = result.debug_step ? ` (step: ${result.debug_step})` : "";
      return { success: false, error: `${errorMsg}${debugInfo}` };
    }

    revalidatePath("/dashboard");
    revalidatePath("/profile");

    return {
      success: true,
      recordsUpdated: result.records_updated,
      goalsUpdated: result.goals_updated,
      assistsUpdated: result.assists_updated,
    };
  } catch (err) {
    console.error("[acceptMergeRequest] Unexpected error:", err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다" 
    };
  }
}

/**
 * 기록 병합 요청 거절
 */
export async function rejectMergeRequest(requestId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("로그인이 필요합니다");

  const { error } = await supabase
    .from("record_merge_requests")
    .update({ status: "rejected", processed_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("invitee_id", user.id)
    .eq("status", "pending");

  if (error) {
    console.error("[rejectMergeRequest] Error:", error.message);
    throw new Error("거절 처리에 실패했습니다");
  }

  revalidatePath("/dashboard");
}

export async function checkUserTeamMembership(
  teamId: string,
  userId: string
): Promise<{
  isMember: boolean;
  status: "active" | "pending" | "left" | null;
  memberId: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("team_members")
    .select("id, status")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .eq("is_guest", false)
    .order("status", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { isMember: false, status: null, memberId: null };
  }

  return {
    isMember: data.status === "active",
    status: data.status as "active" | "pending" | "left",
    memberId: data.id,
  };
}

export async function directMergeGuestRecords(
  teamId: string,
  guestMemberId: string,
  targetUserId: string
): Promise<{
  success: boolean;
  recordsUpdated?: number;
  recordsMerged?: number;
  goalsUpdated?: number;
  assistsUpdated?: number;
  error?: string;
}> {
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
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!myMembership || !["OWNER", "MANAGER"].includes(myMembership.role)) {
    return { success: false, error: "팀 관리자만 직접 병합할 수 있습니다" };
  }

  const membership = await checkUserTeamMembership(teamId, targetUserId);
  if (!membership.isMember) {
    return {
      success: false,
      error: "대상 사용자가 팀의 활성 멤버가 아닙니다. 병합 요청을 사용하세요.",
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("process_direct_merge", {
    p_team_id: teamId,
    p_guest_member_id: guestMemberId,
    p_target_user_id: targetUserId,
    p_manager_id: user.id,
  });

  if (error) {
    console.error("[directMergeGuestRecords] RPC Error:", error.message);
    return { success: false, error: `RPC 에러: ${error.message}` };
  }

  const result = data as {
    success: boolean;
    target_member_id?: string;
    records_updated?: number;
    records_merged?: number;
    goals_updated?: number;
    assists_updated?: number;
    error?: string;
  };

  if (!result.success) {
    return { success: false, error: result.error || "직접 병합에 실패했습니다" };
  }

  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/dashboard");

  return {
    success: true,
    recordsUpdated: result.records_updated,
    recordsMerged: result.records_merged,
    goalsUpdated: result.goals_updated,
    assistsUpdated: result.assists_updated,
  };
}

export async function cancelMergeRequest(requestId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("로그인이 필요합니다");

  // 요청 정보 조회
  const { data: request, error: fetchError } = await supabase
    .from("record_merge_requests")
    .select("team_id")
    .eq("id", requestId)
    .single();

  if (fetchError || !request) {
    throw new Error("유효하지 않은 요청입니다");
  }

  // 권한 확인
  const { data: myMembership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", request.team_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!myMembership || !["OWNER", "MANAGER"].includes(myMembership.role)) {
    throw new Error("팀 관리자만 병합 요청을 취소할 수 있습니다");
  }

  const { error } = await supabase
    .from("record_merge_requests")
    .update({ status: "cancelled", processed_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) {
    console.error("[cancelMergeRequest] Error:", error.message);
    throw new Error("취소 처리에 실패했습니다");
  }

  revalidatePath(`/teams/${request.team_id}`);
}
