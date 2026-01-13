"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Match, MatchRecord, Goal, TeamMember, MatchAttendance, User } from "@/types/supabase";

export type MatchWithRecords = Match & {
  records: (MatchRecord & { team_member: TeamMember | null })[];
  goals: Goal[];
};

export async function getMatchesByTeam(teamId: string): Promise<Match[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("team_id", teamId)
    .order("match_date", { ascending: false });

  if (error) throw error;
  return data as Match[];
}

export async function getMatchById(id: string): Promise<Match | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("matches")
    .select(`
      *,
      opponent_team:teams!matches_opponent_team_id_fkey(id, name, emblem_url),
      venue:venues!matches_venue_id_fkey(id, name, address, address_detail)
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as any;
}

export async function getMatchRecords(matchId: string): Promise<MatchRecord[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("match_records")
    .select("*")
    .eq("match_id", matchId);

  if (error) throw error;
  return data as MatchRecord[];
}

export async function getMatchGoals(matchId: string): Promise<Goal[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("match_id", matchId)
    .order("quarter", { ascending: true });

  if (error) throw error;
  return data as Goal[];
}

export async function createMatch(formData: FormData): Promise<Match> {
  const supabase = await createClient();

  const teamId = formData.get("team_id") as string;
  const opponentName = formData.get("opponent_name") as string || "미정";
  const opponentTeamId = formData.get("opponent_team_id") as string;
  const guestTeamId = formData.get("guest_team_id") as string;
  const isGuestOpponent = formData.get("is_guest_opponent") === "true";
  const matchDate = formData.get("match_date") as string;
  const location = formData.get("location") as string;
  const venueId = formData.get("venue_id") as string;
  const quarters = parseInt(formData.get("quarters") as string) || 4;

  // opponent_team_id has FK to teams table, guest_team_id has FK to guest_teams table
  // Use the appropriate field based on is_guest_opponent flag
  const { data, error } = await supabase
    .from("matches")
    .insert({
      team_id: teamId,
      opponent_name: opponentName,
      opponent_team_id: isGuestOpponent ? null : (opponentTeamId || null),
      guest_team_id: isGuestOpponent ? (guestTeamId || null) : null,
      is_guest_opponent: isGuestOpponent,
      match_date: matchDate,
      location: location || null,
      venue_id: venueId || null,
      quarters,
      status: "SCHEDULED" as const,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create match:", error);
    throw error;
  }

  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/matches");

  return data as Match;
}

export async function updateMatch(
  matchId: string,
  formData: FormData
): Promise<Match> {
  const supabase = await createClient();

  const opponentName = formData.get("opponent_name") as string;
  const matchDate = formData.get("match_date") as string;
  const location = formData.get("location") as string;
  const venueId = formData.get("venue_id") as string;
  const quarters = parseInt(formData.get("quarters") as string) || 4;

  const { data, error } = await supabase
    .from("matches")
    .update({
      opponent_name: opponentName,
      match_date: matchDate,
      location: location || null,
      venue_id: venueId || null,
      quarters,
    })
    .eq("id", matchId)
    .select()
    .single();

  if (error) {
    console.error("Failed to update match:", error);
    throw error;
  }

  const match = data as Match;
  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/teams/${match.team_id}`);
  revalidatePath("/matches");

  return match;
}

export async function saveLineup(
  matchId: string,
  teamMemberIds: string[]
): Promise<void> {
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("match_records")
    .delete()
    .eq("match_id", matchId);

  if (deleteError) throw deleteError;

  if (teamMemberIds.length > 0) {
    const records = teamMemberIds.map((teamMemberId) => ({
      match_id: matchId,
      team_member_id: teamMemberId,
    }));

    const { error: insertError } = await supabase
      .from("match_records")
      .insert(records);

    if (insertError) throw insertError;
  }

  revalidatePath(`/matches/${matchId}`);
}

export async function addGoal(
  matchId: string,
  scoringTeam: "HOME" | "AWAY",
  scorerId: string | null, // HOME: team_member_id, AWAY: opponent_player_id
  assistId: string | null,
  quarter: number,
  goalType: "NORMAL" | "PK" | "FREEKICK" | "OWN_GOAL"
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("goals").insert({
    match_id: matchId,
    scoring_team: scoringTeam,
    team_member_id: scoringTeam === "HOME" ? scorerId : null,
    opponent_player_id: scoringTeam === "AWAY" ? scorerId : null,
    assist_member_id: scoringTeam === "HOME" ? assistId : null,
    assist_opponent_id: scoringTeam === "AWAY" ? assistId : null,
    quarter,
    type: goalType,
  });

  if (error) throw error;

  // HOME 팀 득점일 경우에만 match_records 업데이트
  if (scoringTeam === "HOME" && scorerId && goalType !== "OWN_GOAL") {
    const { data: record } = await supabase
      .from("match_records")
      .select("goals")
      .eq("match_id", matchId)
      .eq("team_member_id", scorerId)
      .single();

    if (record) {
      await supabase
        .from("match_records")
        .update({ goals: (record.goals || 0) + 1 })
        .eq("match_id", matchId)
        .eq("team_member_id", scorerId);
    }
  }

  if (assistId) {
    const { data: record } = await supabase
      .from("match_records")
      .select("assists")
      .eq("match_id", matchId)
      .eq("team_member_id", assistId)
      .single();

    if (record) {
      await supabase
        .from("match_records")
        .update({ assists: (record.assists || 0) + 1 })
        .eq("match_id", matchId)
        .eq("team_member_id", assistId);
    }
  }

  revalidatePath(`/matches/${matchId}`);
}

export async function deleteGoal(goalId: string, matchId: string): Promise<void> {
  const supabase = await createClient();

  // 득점 정보 먼저 가져오기
  const { data: goal } = await supabase
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .single();

  if (!goal) throw new Error("득점 기록을 찾을 수 없습니다");

  // 득점 삭제
  const { error } = await supabase.from("goals").delete().eq("id", goalId);

  if (error) throw error;

  // 득점자의 골 수 감소
  if (goal.team_member_id && goal.type !== "OWN_GOAL") {
    const { data: record } = await supabase
      .from("match_records")
      .select("goals")
      .eq("match_id", matchId)
      .eq("team_member_id", goal.team_member_id)
      .single();

    if (record && record.goals > 0) {
      await supabase
        .from("match_records")
        .update({ goals: record.goals - 1 })
        .eq("match_id", matchId)
        .eq("team_member_id", goal.team_member_id);
    }
  }

  // 도움 기록 감소
  if (goal.assist_member_id) {
    const { data: record } = await supabase
      .from("match_records")
      .select("assists")
      .eq("match_id", matchId)
      .eq("team_member_id", goal.assist_member_id)
      .single();

    if (record && record.assists > 0) {
      await supabase
        .from("match_records")
        .update({ assists: record.assists - 1 })
        .eq("match_id", matchId)
        .eq("team_member_id", goal.assist_member_id);
    }
  }

  revalidatePath(`/matches/${matchId}`);
}

export async function updateMatchScore(
  matchId: string,
  homeScore: number,
  awayScore: number
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("matches")
    .update({
      home_score: homeScore,
      away_score: awayScore,
    })
    .eq("id", matchId);

  if (error) throw error;

  revalidatePath(`/matches/${matchId}`);
}

export async function finishMatch(matchId: string): Promise<void> {
  const supabase = await createClient();

  const { data: match, error: fetchError } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (fetchError) throw fetchError;

  const typedMatch = match as Match;

  const { data: goals, error: goalsError } = await supabase
    .from("goals")
    .select("*")
    .eq("match_id", matchId);

  if (goalsError) throw goalsError;

  const typedGoals = goals as Goal[];
  const homeGoals = typedGoals.filter((g) => g.type !== "OWN_GOAL").length;
  const ownGoals = typedGoals.filter((g) => g.type === "OWN_GOAL").length;
  const calculatedHomeScore = homeGoals;
  const calculatedAwayScore = ownGoals;

  if (
    calculatedHomeScore !== typedMatch.home_score ||
    calculatedAwayScore !== typedMatch.away_score - homeGoals + ownGoals
  ) {
    console.warn("Score mismatch detected, using manually entered score");
  }

  const { error } = await supabase
    .from("matches")
    .update({
      status: "FINISHED" as const,
    })
    .eq("id", matchId);

  if (error) throw error;

  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/teams/${typedMatch.team_id}`);
  revalidatePath("/dashboard");
}

export async function deleteMatch(matchId: string): Promise<void> {
  const supabase = await createClient();

  const { data: match, error: fetchError } = await supabase
    .from("matches")
    .select("team_id")
    .eq("id", matchId)
    .single();

  if (fetchError) throw fetchError;

  const typedMatch = match as Match;

  const { error } = await supabase
    .from("matches")
    .delete()
    .eq("id", matchId);

  if (error) throw error;

  revalidatePath(`/teams/${typedMatch.team_id}`);
  revalidatePath(`/teams/${typedMatch.team_id}/manage/matches`);
  revalidatePath("/dashboard");
}

export type MatchAttendanceWithMember = MatchAttendance & {
  team_member: TeamMember & { user: Pick<User, "id" | "nickname" | "avatar_url"> | null };
};

/**
 * Get all attendance records for a specific match with team member information
 * @param matchId - The ID of the match
 * @returns Array of attendance records with team member details
 */
export async function getMatchAttendance(
  matchId: string
): Promise<MatchAttendanceWithMember[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("match_attendance")
    .select(
      `
      *,
      team_member:team_members!match_attendance_team_member_id_fkey(
        *,
        user:users(id, nickname, avatar_url)
      )
    `
    )
    .eq("match_id", matchId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch match attendance:", error);
    throw error;
  }

  return data as MatchAttendanceWithMember[];
}

/**
 * Update or create attendance status for the current logged-in user
 * @param matchId - The ID of the match
 * @param status - The attendance status ('attending' | 'maybe' | 'absent')
 */
export async function updateAttendance(
  matchId: string,
  status: "attending" | "maybe" | "absent"
): Promise<void> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("로그인이 필요합니다");
  }

  // First, get the match to find the team_id
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("team_id")
    .eq("id", matchId)
    .single();

  if (matchError) {
    console.error("Failed to fetch match:", matchError);
    throw matchError;
  }

  const typedMatch = match as Match;

  // Find the user's team_member_id for this team
  const { data: teamMember, error: teamMemberError } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", typedMatch.team_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (teamMemberError) {
    console.error("Failed to find team member:", teamMemberError);
    throw new Error("이 팀의 멤버가 아닙니다");
  }

  const typedTeamMember = teamMember as TeamMember;

  // Upsert attendance record
  const { error: upsertError } = await supabase
    .from("match_attendance")
    .upsert(
      {
        match_id: matchId,
        team_member_id: typedTeamMember.id,
        status,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "match_id,team_member_id",
      }
    );

  if (upsertError) {
    console.error("Failed to update attendance:", upsertError);
    throw upsertError;
  }

  // 참석으로 변경 시 자동으로 라인업에 추가
  if (status === "attending") {
    // 이미 라인업에 있는지 확인
    const { data: existingRecord } = await supabase
      .from("match_records")
      .select("id")
      .eq("match_id", matchId)
      .eq("team_member_id", typedTeamMember.id)
      .maybeSingle();

    // 없으면 추가
    if (!existingRecord) {
      await supabase.from("match_records").insert({
        match_id: matchId,
        team_member_id: typedTeamMember.id,
        quarters_played: 0,
        goals: 0,
        assists: 0,
        is_mom: false,
        clean_sheet: false,
      });
    }
  } else {
    // 참석 취소 시 라인업에서 제거 (득점/도움이 없는 경우만)
    const { data: record } = await supabase
      .from("match_records")
      .select("goals, assists")
      .eq("match_id", matchId)
      .eq("team_member_id", typedTeamMember.id)
      .maybeSingle();

    if (record && record.goals === 0 && record.assists === 0) {
      await supabase
        .from("match_records")
        .delete()
        .eq("match_id", matchId)
        .eq("team_member_id", typedTeamMember.id);
    }
  }

  // Revalidate relevant paths
  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/teams/${typedMatch.team_id}`);
}

/**
 * Get array of team_member_ids who are attending the match
 * Useful for prioritizing attending members in lineup selection
 * @param matchId - The ID of the match
 * @returns Array of team_member_ids with 'attending' status
 */
export async function getAttendingMembers(matchId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("match_attendance")
    .select("team_member_id")
    .eq("match_id", matchId)
    .eq("status", "attending");

  if (error) {
    console.error("Failed to fetch attending members:", error);
    throw error;
  }

  return data.map((record) => record.team_member_id);
}

/**
 * 두 팀 간의 상대전적 통계를 가져옵니다 (Previous Meetings)
 */
export type HeadToHeadStats = {
  totalMatches: number;
  homeWins: number;
  awayWins: number;
  draws: number;
  homeGoals: number;
  awayGoals: number;
  recentMatches: {
    id: string;
    date: string;
    homeScore: number;
    awayScore: number;
    result: "W" | "D" | "L";
  }[];
};

export async function getHeadToHeadStats(
  teamId: string,
  opponentName: string,
  opponentTeamId: string | null,
  currentMatchId?: string
): Promise<HeadToHeadStats> {
  const supabase = await createClient();

  // 상대팀과의 모든 경기 조회 (완료된 경기만)
  let query = supabase
    .from("matches")
    .select("id, match_date, home_score, away_score, status")
    .eq("team_id", teamId)
    .eq("status", "FINISHED")
    .order("match_date", { ascending: false });

  // opponent_team_id가 있으면 우선 사용, 없으면 이름으로 검색
  if (opponentTeamId) {
    query = query.eq("opponent_team_id", opponentTeamId);
  } else {
    query = query.eq("opponent_name", opponentName);
  }

  const { data: matches, error } = await query;

  if (error) {
    console.error("Failed to fetch head-to-head stats:", error);
    return {
      totalMatches: 0,
      homeWins: 0,
      awayWins: 0,
      draws: 0,
      homeGoals: 0,
      awayGoals: 0,
      recentMatches: [],
    };
  }

  // 현재 경기는 제외
  const filteredMatches = currentMatchId
    ? matches.filter((m) => m.id !== currentMatchId)
    : matches;

  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  let homeGoals = 0;
  let awayGoals = 0;

  const recentMatches = filteredMatches.slice(0, 5).map((match) => {
    const result: "W" | "D" | "L" =
      match.home_score > match.away_score
        ? "W"
        : match.home_score < match.away_score
        ? "L"
        : "D";
    return {
      id: match.id,
      date: match.match_date,
      homeScore: match.home_score,
      awayScore: match.away_score,
      result,
    };
  });

  filteredMatches.forEach((match) => {
    homeGoals += match.home_score;
    awayGoals += match.away_score;

    if (match.home_score > match.away_score) {
      homeWins++;
    } else if (match.home_score < match.away_score) {
      awayWins++;
    } else {
      draws++;
    }
  });

  return {
    totalMatches: filteredMatches.length,
    homeWins,
    awayWins,
    draws,
    homeGoals,
    awayGoals,
    recentMatches,
  };
}

/**
 * 팀의 최근 경기 폼(Team Form)을 가져옵니다
 * 프리미어리그 스타일의 최근 5경기 결과
 */
export type TeamFormMatch = {
  id: string;
  date: string;
  opponentName: string;
  opponentEmblemUrl: string | null;
  homeScore: number;
  awayScore: number;
  result: "W" | "D" | "L";
  isHome: boolean;
};

export type TeamForm = {
  teamId: string;
  teamName: string;
  teamEmblemUrl: string | null;
  recentForm: ("W" | "D" | "L")[]; // 최근 5경기 결과 (최신순)
  matches: TeamFormMatch[];
  stats: {
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
  };
};

export async function getTeamForm(
  teamId: string,
  excludeMatchId?: string,
  limit: number = 5
): Promise<TeamForm | null> {
  const supabase = await createClient();

  // 팀 정보 조회
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, name, emblem_url")
    .eq("id", teamId)
    .single();

  if (teamError || !team) {
    console.error("Failed to fetch team:", teamError);
    return null;
  }

  // 팀의 최근 완료된 경기 조회
  let query = supabase
    .from("matches")
    .select("id, match_date, opponent_name, opponent_team_id, home_score, away_score, status")
    .eq("team_id", teamId)
    .eq("status", "FINISHED")
    .order("match_date", { ascending: false })
    .limit(limit);

  if (excludeMatchId) {
    query = query.neq("id", excludeMatchId);
  }

  const { data: matches, error: matchesError } = await query;

  if (matchesError) {
    console.error("Failed to fetch matches:", matchesError);
    return null;
  }

  // 상대팀 정보 조회 (opponent_team_id가 있는 경우)
  const opponentTeamIds = matches
    .filter((m): m is typeof m & { opponent_team_id: string } => m.opponent_team_id !== null)
    .map((m) => m.opponent_team_id);

  let opponentTeams: Record<string, { name: string; emblem_url: string | null }> = {};

  if (opponentTeamIds.length > 0) {
    const { data: teams } = await supabase
      .from("teams")
      .select("id, name, emblem_url")
      .in("id", opponentTeamIds);

    if (teams) {
      opponentTeams = teams.reduce((acc, t) => {
        acc[t.id] = { name: t.name, emblem_url: t.emblem_url };
        return acc;
      }, {} as Record<string, { name: string; emblem_url: string | null }>);
    }
  }

  // 결과 계산
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  const recentForm: ("W" | "D" | "L")[] = [];

  const formMatches: TeamFormMatch[] = matches.map((match) => {
    const result: "W" | "D" | "L" =
      match.home_score > match.away_score
        ? "W"
        : match.home_score < match.away_score
        ? "L"
        : "D";

    recentForm.push(result);
    goalsFor += match.home_score;
    goalsAgainst += match.away_score;

    if (result === "W") wins++;
    else if (result === "D") draws++;
    else losses++;

    // 상대팀 정보 (연결된 팀이 있으면 현재 이름 사용)
    const opponentInfo = match.opponent_team_id
      ? opponentTeams[match.opponent_team_id]
      : null;

    return {
      id: match.id,
      date: match.match_date,
      opponentName: opponentInfo?.name || match.opponent_name,
      opponentEmblemUrl: opponentInfo?.emblem_url || null,
      homeScore: match.home_score,
      awayScore: match.away_score,
      result,
      isHome: true, // 현재 시스템에서는 항상 홈 팀으로 기록
    };
  });

  return {
    teamId: team.id,
    teamName: team.name,
    teamEmblemUrl: team.emblem_url,
    recentForm,
    matches: formMatches,
    stats: {
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
    },
  };
}
