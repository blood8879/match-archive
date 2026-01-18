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
      venue:venues!matches_venue_id_fkey(id, name, address)
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
      venue:venues!matches_venue_id_fkey(id, name, address)
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
