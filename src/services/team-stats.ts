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

export type RecentMatch = {
  result: "W" | "D" | "L";
  homeScore: number;
  awayScore: number;
  opponentName: string;
  matchDate: string;
};

/**
 * 팀의 전체 통계를 계산합니다
 */
export async function getTeamStatistics(
  teamId: string
): Promise<TeamStatistics> {
  const supabase = await createClient();

  // 완료된 경기만 조회
  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .eq("team_id", teamId)
    .eq("status", "FINISHED")
    .order("match_date", { ascending: false });

  if (error) {
    console.error("Failed to fetch team matches:", error);
    throw error;
  }

  const typedMatches = matches as Match[];
  const totalMatches = typedMatches.length;

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

  typedMatches.forEach((match) => {
    const homeScore = match.home_score || 0;
    const awayScore = match.away_score || 0;

    totalGoalsScored += homeScore;
    totalGoalsConceded += awayScore;

    if (homeScore > awayScore) {
      wins++;
    } else if (homeScore === awayScore) {
      draws++;
    } else {
      losses++;
    }
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

  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .eq("team_id", teamId)
    .eq("status", "FINISHED")
    .order("match_date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch recent matches:", error);
    throw error;
  }

  const typedMatches = matches as Match[];

  return typedMatches.map((match) => {
    const homeScore = match.home_score || 0;
    const awayScore = match.away_score || 0;

    let result: "W" | "D" | "L";
    if (homeScore > awayScore) {
      result = "W";
    } else if (homeScore === awayScore) {
      result = "D";
    } else {
      result = "L";
    }

    return {
      result,
      homeScore,
      awayScore,
      opponentName: match.opponent_name,
      matchDate: match.match_date,
    };
  });
}

export type MatchWithOpponentTeam = Match & {
  opponent_team: { id: string; name: string; emblem_url: string | null } | null;
  venue: { id: string; name: string; address: string } | null;
};

/**
 * 다음 예정된 경기를 반환합니다
 */
export async function getNextMatch(teamId: string): Promise<MatchWithOpponentTeam | null> {
  const supabase = await createClient();

  const now = new Date().toISOString();

  const { data: matches, error } = await supabase
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

  if (error) {
    console.error("Failed to fetch next match:", error);
    throw error;
  }

  const typedMatches = matches as MatchWithOpponentTeam[];
  return typedMatches.length > 0 ? typedMatches[0] : null;
}
