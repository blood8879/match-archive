"use server";

import { createClient } from "@/lib/supabase/server";
import type { Match } from "@/types/supabase";

export type TeamStatistics = {
  totalMatches: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  totalGoalsScored: number;
  totalGoalsConceded: number;
  averageGoalsPerMatch: number;
};

export type SeasonStats = {
  wins: number;
  draws: number;
  losses: number;
  totalMatches: number;
  seasonYear: number;
};

export type TeamSeasonSummary = {
  totalGoals: number;
  totalAssists: number;
  totalMatches: number;
  maxWinStreak: number;
  seasonYear: number;
};

/**
 * 현재 시즌의 팀 종합 통계를 반환합니다 (팀 총득점, 총어시스트, 경기수, 최다연승)
 */
export async function getTeamSeasonSummary(teamId: string): Promise<TeamSeasonSummary> {
  const supabase = await createClient();
  const { start, end, year } = getCurrentSeasonRange();

  // 홈 경기 조회
  const { data: homeMatches } = await supabase
    .from("matches")
    .select("id, home_score, away_score, match_date")
    .eq("team_id", teamId)
    .eq("status", "FINISHED")
    .gte("match_date", start)
    .lte("match_date", end)
    .order("match_date", { ascending: true });

  // 원정 경기 조회
  const { data: awayMatches } = await supabase
    .from("matches")
    .select("id, home_score, away_score, match_date")
    .eq("opponent_team_id", teamId)
    .eq("status", "FINISHED")
    .gte("match_date", start)
    .lte("match_date", end)
    .order("match_date", { ascending: true });

  // 모든 경기 합치고 날짜순 정렬 (최다연승 계산용)
  type MatchResult = { matchDate: string; isWin: boolean; goalsScored: number };
  const allMatchResults: MatchResult[] = [];

  (homeMatches || []).forEach((m) => {
    const home = m.home_score || 0;
    const away = m.away_score || 0;
    allMatchResults.push({
      matchDate: m.match_date,
      isWin: home > away,
      goalsScored: home,
    });
  });

  (awayMatches || []).forEach((m) => {
    const home = m.home_score || 0;
    const away = m.away_score || 0;
    allMatchResults.push({
      matchDate: m.match_date,
      isWin: away > home,
      goalsScored: away,
    });
  });

  // 날짜순 정렬
  allMatchResults.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

  // 최다연승 계산
  let maxWinStreak = 0;
  let currentStreak = 0;
  for (const match of allMatchResults) {
    if (match.isWin) {
      currentStreak++;
      maxWinStreak = Math.max(maxWinStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  // 팀 총득점 (모든 경기에서 얻은 골)
  const totalGoals = allMatchResults.reduce((sum, m) => sum + m.goalsScored, 0);

  // 팀 총어시스트 계산 (match_records에서)
  const matchIds = [
    ...(homeMatches || []).map((m) => m.id),
    ...(awayMatches || []).map((m) => m.id),
  ];

  let totalAssists = 0;
  if (matchIds.length > 0) {
    const { data: records } = await supabase
      .from("match_records")
      .select("assists")
      .in("match_id", matchIds);

    totalAssists = (records || []).reduce((sum, r) => sum + (r.assists || 0), 0);
  }

  return {
    totalGoals,
    totalAssists,
    totalMatches: allMatchResults.length,
    maxWinStreak,
    seasonYear: year,
  };
}

function getCurrentSeasonRange(): { start: string; end: string; year: number } {
  const now = new Date();
  const year = now.getFullYear();
  return {
    start: `${year}-01-01T00:00:00.000Z`,
    end: `${year}-12-31T23:59:59.999Z`,
    year,
  };
}

export type RecentMatch = {
  result: "W" | "D" | "L";
  homeScore: number;
  awayScore: number;
  opponentName: string;
  matchDate: string;
};

export async function getTeamAvailableYears(teamId: string): Promise<number[]> {
  const supabase = await createClient();
  
  const { data: homeMatches } = await supabase
    .from("matches")
    .select("match_date")
    .eq("team_id", teamId)
    .eq("status", "FINISHED");

  const { data: awayMatches } = await supabase
    .from("matches")
    .select("match_date")
    .eq("opponent_team_id", teamId)
    .eq("status", "FINISHED");

  const allDates = [
    ...(homeMatches || []).map((m) => m.match_date),
    ...(awayMatches || []).map((m) => m.match_date),
  ];

  const years = new Set<number>();
  allDates.forEach((date) => {
    if (date) {
      years.add(new Date(date).getFullYear());
    }
  });

  return Array.from(years).sort((a, b) => b - a);
}

/**
 * 현재 시즌의 팀 승/무/패 통계를 반환합니다
 */
export async function getSeasonStatistics(teamId: string): Promise<SeasonStats> {
  const supabase = await createClient();
  const { start, end, year } = getCurrentSeasonRange();

  const { data: homeMatches } = await supabase
    .from("matches")
    .select("home_score, away_score")
    .eq("team_id", teamId)
    .eq("status", "FINISHED")
    .gte("match_date", start)
    .lte("match_date", end);

  const { data: awayMatches } = await supabase
    .from("matches")
    .select("home_score, away_score")
    .eq("opponent_team_id", teamId)
    .eq("status", "FINISHED")
    .gte("match_date", start)
    .lte("match_date", end);

  let wins = 0;
  let draws = 0;
  let losses = 0;

  (homeMatches || []).forEach((m) => {
    const home = m.home_score || 0;
    const away = m.away_score || 0;
    if (home > away) wins++;
    else if (home === away) draws++;
    else losses++;
  });

  (awayMatches || []).forEach((m) => {
    const home = m.home_score || 0;
    const away = m.away_score || 0;
    if (away > home) wins++;
    else if (away === home) draws++;
    else losses++;
  });

  return {
    wins,
    draws,
    losses,
    totalMatches: wins + draws + losses,
    seasonYear: year,
  };
}

/**
 * 팀의 전체 통계를 계산합니다
 */
export async function getTeamStatistics(
  teamId: string
): Promise<TeamStatistics> {
  const supabase = await createClient();

  // 홈 경기 조회 (team_id)
  const { data: homeMatches, error: homeError } = await supabase
    .from("matches")
    .select("*")
    .eq("team_id", teamId)
    .eq("status", "FINISHED");

  // 원정 경기 조회 (opponent_team_id)
  const { data: awayMatches, error: awayError } = await supabase
    .from("matches")
    .select("*")
    .eq("opponent_team_id", teamId)
    .eq("status", "FINISHED");

  if (homeError || awayError) {
    console.error("Failed to fetch team matches:", homeError || awayError);
    throw homeError || awayError;
  }

  const totalMatches = (homeMatches?.length || 0) + (awayMatches?.length || 0);

  if (totalMatches === 0) {
    return {
      totalMatches: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      winRate: 0,
      totalGoalsScored: 0,
      totalGoalsConceded: 0,
      averageGoalsPerMatch: 0,
    };
  }

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let totalGoalsScored = 0;
  let totalGoalsConceded = 0;

  // 홈 경기 통계
  (homeMatches || []).forEach((match) => {
    const homeScore = match.home_score || 0;
    const awayScore = match.away_score || 0;

    totalGoalsScored += homeScore;
    totalGoalsConceded += awayScore;

    if (homeScore > awayScore) wins++;
    else if (homeScore === awayScore) draws++;
    else losses++;
  });

  // 원정 경기 통계 (점수 역전)
  (awayMatches || []).forEach((match) => {
    const homeScore = match.home_score || 0;
    const awayScore = match.away_score || 0;

    // 원정팀이므로 away_score가 내 점수
    totalGoalsScored += awayScore;
    totalGoalsConceded += homeScore;

    if (awayScore > homeScore) wins++;
    else if (awayScore === homeScore) draws++;
    else losses++;
  });

  const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
  const averageGoalsPerMatch =
    totalMatches > 0 ? totalGoalsScored / totalMatches : 0;

  return {
    totalMatches,
    wins,
    draws,
    losses,
    winRate: Math.round(winRate * 10) / 10, // 소수점 1자리
    totalGoalsScored,
    totalGoalsConceded,
    averageGoalsPerMatch: Math.round(averageGoalsPerMatch * 10) / 10, // 소수점 1자리
  };
}

/**
 * 최근 N경기 결과를 반환합니다
 */
export async function getRecentMatches(
  teamId: string,
  limit: number = 5
): Promise<RecentMatch[]> {
  const supabase = await createClient();

  // 홈 경기 조회
  const { data: homeMatches, error: homeError } = await supabase
    .from("matches")
    .select("*, opponent_team:teams!matches_opponent_team_id_fkey(id, name)")
    .eq("team_id", teamId)
    .eq("status", "FINISHED");

  // 원정 경기 조회
  const { data: awayMatches, error: awayError } = await supabase
    .from("matches")
    .select("*, home_team:teams!matches_team_id_fkey(id, name)")
    .eq("opponent_team_id", teamId)
    .eq("status", "FINISHED");

  if (homeError || awayError) {
    console.error("Failed to fetch recent matches:", homeError || awayError);
    throw homeError || awayError;
  }

  // 홈/원정 경기 합치기
  type MatchWithRole = Match & { isHome: boolean; opponentDisplayName: string };

  const allMatches: MatchWithRole[] = [
    ...(homeMatches || []).map((m: any) => ({
      ...m,
      isHome: true,
      opponentDisplayName: m.opponent_team?.name || m.opponent_name,
    })),
    ...(awayMatches || []).map((m: any) => ({
      ...m,
      isHome: false,
      opponentDisplayName: m.home_team?.name || "상대팀",
    })),
  ]
    .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
    .slice(0, limit);

  return allMatches.map((match) => {
    const homeScore = match.home_score || 0;
    const awayScore = match.away_score || 0;

    // 홈/원정에 따라 결과 계산
    let myGoals: number;
    let theirGoals: number;

    if (match.isHome) {
      myGoals = homeScore;
      theirGoals = awayScore;
    } else {
      myGoals = awayScore;
      theirGoals = homeScore;
    }

    let result: "W" | "D" | "L";
    if (myGoals > theirGoals) {
      result = "W";
    } else if (myGoals === theirGoals) {
      result = "D";
    } else {
      result = "L";
    }

    return {
      result,
      homeScore,
      awayScore,
      opponentName: match.opponentDisplayName,
      matchDate: match.match_date,
    };
  });
}

export type MatchWithOpponentTeam = Match & {
  opponent_team: { id: string; name: string; emblem_url: string | null } | null;
  venue: { id: string; name: string; address: string } | null;
  isAwayMatch?: boolean; // 원정 경기 여부
  home_team?: { id: string; name: string; emblem_url: string | null } | null;
};

/**
 * 다음 예정된 경기를 반환합니다
 */
export async function getNextMatch(teamId: string): Promise<MatchWithOpponentTeam | null> {
  const supabase = await createClient();

  const now = new Date().toISOString();

  // 홈 경기 조회
  const { data: homeMatches, error: homeError } = await supabase
    .from("matches")
    .select(`
      *,
      opponent_team:teams!matches_opponent_team_id_fkey(id, name, emblem_url),
      venue:venues!matches_venue_id_fkey(id, name, address, latitude, longitude)
    `)
    .eq("team_id", teamId)
    .eq("status", "SCHEDULED")
    .gte("match_date", now)
    .order("match_date", { ascending: true })
    .limit(1);

  // 원정 경기 조회 (opponent_team_id로 참여)
  const { data: awayMatches, error: awayError } = await supabase
    .from("matches")
    .select(`
      *,
      home_team:teams!matches_team_id_fkey(id, name, emblem_url),
      venue:venues!matches_venue_id_fkey(id, name, address, latitude, longitude)
    `)
    .eq("opponent_team_id", teamId)
    .eq("status", "SCHEDULED")
    .gte("match_date", now)
    .order("match_date", { ascending: true })
    .limit(1);

  if (homeError || awayError) {
    console.error("Failed to fetch next match:", homeError || awayError);
    throw homeError || awayError;
  }

  // 홈 경기와 원정 경기 중 가장 빠른 경기 선택
  const homeMatch = homeMatches?.[0] as MatchWithOpponentTeam | undefined;
  const awayMatch = awayMatches?.[0] as (MatchWithOpponentTeam & { home_team: { id: string; name: string; emblem_url: string | null } }) | undefined;

  if (!homeMatch && !awayMatch) {
    return null;
  }

  if (!homeMatch) {
    // 원정 경기만 있음 - 상대팀을 홈팀으로 표시
    return {
      ...awayMatch!,
      isAwayMatch: true,
      // 원정 경기에서는 home_team이 상대팀
      opponent_team: awayMatch!.home_team || null,
      opponent_name: awayMatch!.home_team?.name || awayMatch!.opponent_name,
    };
  }

  if (!awayMatch) {
    // 홈 경기만 있음
    return { ...homeMatch, isAwayMatch: false };
  }

  // 둘 다 있으면 더 빠른 경기 선택
  const homeDate = new Date(homeMatch.match_date).getTime();
  const awayDate = new Date(awayMatch.match_date).getTime();

  if (homeDate <= awayDate) {
    return { ...homeMatch, isAwayMatch: false };
  } else {
    return {
      ...awayMatch,
      isAwayMatch: true,
      opponent_team: awayMatch.home_team || null,
      opponent_name: awayMatch.home_team?.name || awayMatch.opponent_name,
    };
  }
}

export type GoalTypeDistribution = {
  type: string;
  count: number;
  percentage: number;
};

export type QuarterGoals = {
  quarter: string;
  goals: number;
};

export type PlayerRanking = {
  memberId: string;
  name: string;
  avatarUrl: string | null;
  value: number;
};

export type ScorerAssistPair = {
  scorerName: string;
  assistName: string;
  count: number;
};

export type TeamDetailedStats = {
  goalTypeDistribution: GoalTypeDistribution[];
  quarterGoals: QuarterGoals[];
  topScorers: PlayerRanking[];
  topAssists: PlayerRanking[];
  topMom: PlayerRanking[];
  topAppearances: PlayerRanking[];
  allScorers: PlayerRanking[];
  allAssists: PlayerRanking[];
  allMom: PlayerRanking[];
  allAppearances: PlayerRanking[];
  scorerAssistPairs: ScorerAssistPair[];
  allScorerAssistPairs: ScorerAssistPair[];
  goalDistribution: PlayerRanking[];
  totalGoals: number;
  seasonYear: number;
};

export async function getTeamDetailedStats(
  teamId: string,
  year?: number
): Promise<TeamDetailedStats> {
  const supabase = await createClient();
  const seasonYear = year || new Date().getFullYear();
  const startDate = `${seasonYear}-01-01T00:00:00.000Z`;
  const endDate = `${seasonYear}-12-31T23:59:59.999Z`;

  const { data: matches } = await supabase
    .from("matches")
    .select("id, home_score, is_home")
    .eq("team_id", teamId)
    .eq("status", "FINISHED")
    .gte("match_date", startDate)
    .lte("match_date", endDate);

  const matchIds = matches?.map((m) => m.id) || [];

  if (matchIds.length === 0) {
    return {
      goalTypeDistribution: [],
      quarterGoals: [],
      topScorers: [],
      topAssists: [],
      topMom: [],
      topAppearances: [],
      allScorers: [],
      allAssists: [],
      allMom: [],
      allAppearances: [],
      scorerAssistPairs: [],
      allScorerAssistPairs: [],
      goalDistribution: [],
      totalGoals: 0,
      seasonYear,
    };
  }

  const { data: goals } = await supabase
    .from("goals")
    .select(`
      id, type, quarter, scoring_team,
      team_member_id, assist_member_id,
      scorer:team_members!goals_team_member_id_fkey(id, user:users(id, nickname, avatar_url), guest_name, is_guest),
      assister:team_members!goals_assist_member_id_fkey(id, user:users(id, nickname, avatar_url), guest_name, is_guest)
    `)
    .in("match_id", matchIds);

  const { data: records } = await supabase
    .from("match_records")
    .select(`
      id, goals, assists, is_mom,
      team_member:team_members!match_records_team_member_id_fkey(
        id, user:users(id, nickname, avatar_url), guest_name, is_guest
      )
    `)
    .in("match_id", matchIds);

  const goalTypeMap: Record<string, number> = { NORMAL: 0, PK: 0, FREEKICK: 0, OWN_GOAL: 0 };
  const quarterMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

  (goals || []).forEach((g: any) => {
    if (g.team_member_id) {
      goalTypeMap[g.type] = (goalTypeMap[g.type] || 0) + 1;
      if (g.quarter >= 1 && g.quarter <= 4) {
        quarterMap[g.quarter] = (quarterMap[g.quarter] || 0) + 1;
      }
    }
  });

  const totalGoalsCount = Object.values(goalTypeMap).reduce((a, b) => a + b, 0);
  const goalTypeLabels: Record<string, string> = {
    NORMAL: "일반골",
    PK: "페널티킥",
    FREEKICK: "프리킥",
    OWN_GOAL: "자책골",
  };

  const goalTypeDistribution: GoalTypeDistribution[] = Object.entries(goalTypeMap)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => ({
      type: goalTypeLabels[type] || type,
      count,
      percentage: totalGoalsCount > 0 ? Math.round((count / totalGoalsCount) * 100) : 0,
    }));

  const quarterGoals: QuarterGoals[] = Object.entries(quarterMap).map(([q, goals]) => ({
    quarter: `${q}Q`,
    goals,
  }));

  const getMemberName = (member: any): string => {
    if (!member) return "알 수 없음";
    return member.is_guest ? member.guest_name || "용병" : member.user?.nickname || "알 수 없음";
  };

  const getMemberAvatar = (member: any): string | null => {
    if (!member || member.is_guest) return null;
    return member.user?.avatar_url || null;
  };

  const playerGoals: Record<string, { name: string; avatar: string | null; goals: number }> = {};
  const playerAssists: Record<string, { name: string; avatar: string | null; assists: number }> = {};
  const playerMom: Record<string, { name: string; avatar: string | null; count: number }> = {};
  const playerAppearances: Record<string, { name: string; avatar: string | null; count: number }> = {};

  (records || []).forEach((r: any) => {
    const memberId = r.team_member?.id;
    if (!memberId) return;
    const name = getMemberName(r.team_member);
    const avatar = getMemberAvatar(r.team_member);

    if (r.goals > 0) {
      if (!playerGoals[memberId]) playerGoals[memberId] = { name, avatar, goals: 0 };
      playerGoals[memberId].goals += r.goals;
    }

    if (r.assists > 0) {
      if (!playerAssists[memberId]) playerAssists[memberId] = { name, avatar, assists: 0 };
      playerAssists[memberId].assists += r.assists;
    }

    if (r.is_mom) {
      if (!playerMom[memberId]) playerMom[memberId] = { name, avatar, count: 0 };
      playerMom[memberId].count += 1;
    }

    if (!playerAppearances[memberId]) playerAppearances[memberId] = { name, avatar, count: 0 };
    playerAppearances[memberId].count += 1;
  });

  const allScorers: PlayerRanking[] = Object.entries(playerGoals)
    .sort((a, b) => b[1].goals - a[1].goals)
    .map(([id, data]) => ({ memberId: id, name: data.name, avatarUrl: data.avatar, value: data.goals }));
  const topScorers = allScorers.slice(0, 5);

  const allAssists: PlayerRanking[] = Object.entries(playerAssists)
    .sort((a, b) => b[1].assists - a[1].assists)
    .map(([id, data]) => ({ memberId: id, name: data.name, avatarUrl: data.avatar, value: data.assists }));
  const topAssists = allAssists.slice(0, 5);

  const allMom: PlayerRanking[] = Object.entries(playerMom)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([id, data]) => ({ memberId: id, name: data.name, avatarUrl: data.avatar, value: data.count }));
  const topMom = allMom.slice(0, 5);

  const allAppearances: PlayerRanking[] = Object.entries(playerAppearances)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([id, data]) => ({ memberId: id, name: data.name, avatarUrl: data.avatar, value: data.count }));
  const topAppearances = allAppearances.slice(0, 5);

  const pairMap: Record<string, { scorerName: string; assistName: string; count: number }> = {};
  (goals || []).forEach((g: any) => {
    if (g.team_member_id && g.assist_member_id) {
      const scorerName = getMemberName(g.scorer);
      const assistName = getMemberName(g.assister);
      const key = `${g.team_member_id}-${g.assist_member_id}`;
      if (!pairMap[key]) pairMap[key] = { scorerName, assistName, count: 0 };
      pairMap[key].count += 1;
    }
  });

  const allScorerAssistPairs: ScorerAssistPair[] = Object.values(pairMap)
    .sort((a, b) => b.count - a.count);

  const scorerAssistPairs = allScorerAssistPairs.slice(0, 5);

  const goalDistribution: PlayerRanking[] = Object.entries(playerGoals)
    .sort((a, b) => b[1].goals - a[1].goals)
    .map(([id, data]) => ({
      memberId: id,
      name: data.name,
      avatarUrl: data.avatar,
      value: totalGoalsCount > 0 ? Math.round((data.goals / totalGoalsCount) * 100) : 0,
    }));

  return {
    goalTypeDistribution,
    quarterGoals,
    topScorers,
    topAssists,
    topMom,
    topAppearances,
    allScorers,
    allAssists,
    allMom,
    allAppearances,
    scorerAssistPairs,
    allScorerAssistPairs,
    goalDistribution,
    totalGoals: totalGoalsCount,
    seasonYear,
  };
}
