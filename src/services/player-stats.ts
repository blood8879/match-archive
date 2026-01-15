"use server";

import { createClient } from "@/lib/supabase/server";
import type { TeamMember, User } from "@/types/supabase";

export type PlayerStats = {
  totalMatches: number;
  totalGoals: number;
  totalAssists: number;
  totalMOM: number;
  totalCleanSheets: number;
  averageQuarters: number;
};

export type PlayerWithStats = {
  teamMember: TeamMember;
  user: Pick<User, "id" | "nickname" | "avatar_url" | "position" | "birth_date" | "nationality" | "preferred_foot"> | null;
  stats: PlayerStats;
};

export type MonthlyStats = {
  month: string;
  goals: number;
  assists: number;
};

export type RecentMatch = {
  matchId: string;
  matchDate: string;
  opponentName: string;
  result: "승" | "무" | "패";
  homeScore: number;
  awayScore: number;
  goals: number;
  assists: number;
  quartersPlayed: number;
  rating: number;
};

/**
 * 플레이어의 전체 통계를 가져옵니다 (완료된 경기만 포함)
 * @param userId - 사용자 ID
 * @param teamId - 팀 ID
 * @returns 플레이어 통계
 */
export async function getPlayerStats(
  userId: string,
  teamId: string
): Promise<PlayerStats> {
  const supabase = await createClient();

  // team_member_id 찾기
  const { data: teamMember, error: memberError } = await supabase
    .from("team_members")
    .select("id")
    .eq("user_id", userId)
    .eq("team_id", teamId)
    .eq("status", "active")
    .single();

  if (memberError || !teamMember) {
    return {
      totalMatches: 0,
      totalGoals: 0,
      totalAssists: 0,
      totalMOM: 0,
      totalCleanSheets: 0,
      averageQuarters: 0,
    };
  }

  // 경기 기록과 매치 정보 가져오기 (상태 확인용)
  const { data: records, error: recordsError } = await supabase
    .from("match_records")
    .select(`
      *,
      match:matches!match_records_match_id_fkey(
        id,
        status
      )
    `)
    .eq("team_member_id", teamMember.id);

  if (recordsError || !records) {
    return {
      totalMatches: 0,
      totalGoals: 0,
      totalAssists: 0,
      totalMOM: 0,
      totalCleanSheets: 0,
      averageQuarters: 0,
    };
  }

  // 완료된 경기만 필터링
  const finishedRecords = records.filter(
    (r: any) => r.match?.status === "FINISHED"
  );

  const totalMatches = finishedRecords.length;
  const totalGoals = finishedRecords.reduce((sum: number, r: any) => sum + (r.goals || 0), 0);
  const totalAssists = finishedRecords.reduce((sum: number, r: any) => sum + (r.assists || 0), 0);
  const totalMOM = finishedRecords.filter((r: any) => r.is_mom).length;
  const totalCleanSheets = finishedRecords.filter((r: any) => r.clean_sheet).length;
  const totalQuarters = finishedRecords.reduce(
    (sum: number, r: any) => sum + (r.quarters_played || 0),
    0
  );
  const averageQuarters =
    totalMatches > 0 ? Math.round((totalQuarters / totalMatches) * 10) / 10 : 0;

  return {
    totalMatches,
    totalGoals,
    totalAssists,
    totalMOM,
    totalCleanSheets,
    averageQuarters,
  };
}

/**
 * 플레이어의 월별 통계를 가져옵니다
 * @param userId - 사용자 ID
 * @param teamId - 팀 ID
 * @param year - 연도 (선택)
 * @returns 월별 통계
 */
export async function getMonthlyStats(
  userId: string,
  teamId: string,
  year?: number
): Promise<MonthlyStats[]> {
  const supabase = await createClient();

  // team_member_id 찾기
  const { data: teamMember, error: memberError } = await supabase
    .from("team_members")
    .select("id")
    .eq("user_id", userId)
    .eq("team_id", teamId)
    .eq("status", "active")
    .single();

  if (memberError || !teamMember) {
    return [];
  }

  // 경기 기록과 매치 정보 가져오기
  const { data: records, error: recordsError } = await supabase
    .from("match_records")
    .select(
      `
      *,
      match:matches!match_records_match_id_fkey(
        id,
        match_date,
        status
      )
    `
    )
    .eq("team_member_id", teamMember.id);

  if (recordsError || !records) {
    return [];
  }

  // 완료된 경기만 필터링
  const finishedRecords = records.filter(
    (r: any) => r.match?.status === "FINISHED"
  );

  // 연도별 필터링
  const filteredRecords = year
    ? finishedRecords.filter((r: any) => {
        const matchYear = new Date(r.match.match_date).getFullYear();
        return matchYear === year;
      })
    : finishedRecords;

  // 월별로 그룹화
  const monthlyData: { [key: string]: { goals: number; assists: number } } = {};

  filteredRecords.forEach((record: any) => {
    const date = new Date(record.match.match_date);
    const month = `${date.getMonth() + 1}월`;

    if (!monthlyData[month]) {
      monthlyData[month] = { goals: 0, assists: 0 };
    }

    monthlyData[month].goals += record.goals || 0;
    monthlyData[month].assists += record.assists || 0;
  });

  // 1월부터 12월까지 순서대로 정렬
  const months = [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ];

  return months
    .map((month) => ({
      month,
      goals: monthlyData[month]?.goals || 0,
      assists: monthlyData[month]?.assists || 0,
    }))
    .filter((m) => m.goals > 0 || m.assists > 0);
}

/**
 * 플레이어의 최근 경기 기록을 가져옵니다
 * @param userId - 사용자 ID
 * @param teamId - 팀 ID
 * @param limit - 가져올 경기 수
 * @returns 최근 경기 기록
 */
export async function getRecentMatches(
  userId: string,
  teamId: string,
  limit: number = 10
): Promise<RecentMatch[]> {
  const supabase = await createClient();

  // team_member_id 찾기
  const { data: teamMember, error: memberError } = await supabase
    .from("team_members")
    .select("id")
    .eq("user_id", userId)
    .eq("team_id", teamId)
    .eq("status", "active")
    .single();

  if (memberError || !teamMember) {
    return [];
  }

  // 경기 기록과 매치 정보 가져오기
  const { data: records, error: recordsError } = await supabase
    .from("match_records")
    .select(
      `
      *,
      match:matches!match_records_match_id_fkey(
        id,
        match_date,
        opponent_name,
        home_score,
        away_score,
        status
      )
    `
    )
    .eq("team_member_id", teamMember.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (recordsError || !records) {
    return [];
  }

  // 완료된 경기만 필터링 및 매핑
  return records
    .filter((r: any) => r.match?.status === "FINISHED")
    .map((record: any) => {
      const homeScore = record.match.home_score || 0;
      const awayScore = record.match.away_score || 0;

      let result: "승" | "무" | "패";
      if (homeScore > awayScore) result = "승";
      else if (homeScore < awayScore) result = "패";
      else result = "무";

      // 간단한 평점 계산 (골 + 도움 + 출전 쿼터 기반)
      const goalsWeight = (record.goals || 0) * 1.5;
      const assistsWeight = (record.assists || 0) * 1.0;
      const quartersWeight = (record.quarters_played || 0) * 0.3;
      const baseRating = 6.0;
      const rating = Math.min(
        10,
        Math.round((baseRating + goalsWeight + assistsWeight + quartersWeight) * 10) /
          10
      );

      return {
        matchId: record.match.id,
        matchDate: record.match.match_date,
        opponentName: record.match.opponent_name,
        result,
        homeScore,
        awayScore,
        goals: record.goals || 0,
        assists: record.assists || 0,
        quartersPlayed: record.quarters_played || 0,
        rating,
      };
    });
}

/**
 * team_member_id로 플레이어 정보와 통계를 가져옵니다
 * @param teamMemberId - 팀 멤버 ID
 * @returns 플레이어 정보와 통계
 */
export type SeasonStats = {
  season: number; // 연도
  matches: number;
  goals: number;
  assists: number;
  mom: number;
  cleanSheets: number;
};

/**
 * 플레이어의 시즌별 커리어 통계를 가져옵니다
 * @param userId - 사용자 ID
 * @param teamId - 팀 ID
 * @returns 시즌별 통계 배열
 */
export async function getCareerStats(
  userId: string,
  teamId: string
): Promise<SeasonStats[]> {
  const supabase = await createClient();

  // team_member_id 찾기
  const { data: teamMember, error: memberError } = await supabase
    .from("team_members")
    .select("id")
    .eq("user_id", userId)
    .eq("team_id", teamId)
    .eq("status", "active")
    .single();

  if (memberError || !teamMember) {
    return [];
  }

  // 경기 기록과 매치 정보 가져오기
  const { data: records, error: recordsError } = await supabase
    .from("match_records")
    .select(
      `
      *,
      match:matches!match_records_match_id_fkey(
        id,
        match_date,
        status
      )
    `
    )
    .eq("team_member_id", teamMember.id);

  if (recordsError || !records) {
    return [];
  }

  // 완료된 경기만 필터링
  const finishedRecords = records.filter(
    (r: any) => r.match?.status === "FINISHED"
  );

  // 시즌(연도)별로 그룹화
  const seasonData: {
    [year: number]: {
      matches: number;
      goals: number;
      assists: number;
      mom: number;
      cleanSheets: number;
    };
  } = {};

  finishedRecords.forEach((record: any) => {
    const year = new Date(record.match.match_date).getFullYear();

    if (!seasonData[year]) {
      seasonData[year] = { matches: 0, goals: 0, assists: 0, mom: 0, cleanSheets: 0 };
    }

    seasonData[year].matches += 1;
    seasonData[year].goals += record.goals || 0;
    seasonData[year].assists += record.assists || 0;
    if (record.is_mom) seasonData[year].mom += 1;
    if (record.clean_sheet) seasonData[year].cleanSheets += 1;
  });

  // 연도별로 정렬 (최신 시즌 먼저)
  return Object.entries(seasonData)
    .map(([year, data]) => ({
      season: parseInt(year),
      ...data,
    }))
    .sort((a, b) => b.season - a.season);
}

/**
 * 특정 연도의 플레이어 통계를 가져옵니다
 * @param userId - 사용자 ID
 * @param teamId - 팀 ID
 * @param year - 연도
 * @returns 플레이어 통계
 */
export async function getPlayerStatsByYear(
  userId: string,
  teamId: string,
  year: number
): Promise<PlayerStats> {
  const supabase = await createClient();

  // team_member_id 찾기
  const { data: teamMember, error: memberError } = await supabase
    .from("team_members")
    .select("id")
    .eq("user_id", userId)
    .eq("team_id", teamId)
    .eq("status", "active")
    .single();

  if (memberError || !teamMember) {
    return {
      totalMatches: 0,
      totalGoals: 0,
      totalAssists: 0,
      totalMOM: 0,
      totalCleanSheets: 0,
      averageQuarters: 0,
    };
  }

  // 경기 기록과 매치 정보 가져오기
  const { data: records, error: recordsError } = await supabase
    .from("match_records")
    .select(
      `
      *,
      match:matches!match_records_match_id_fkey(
        id,
        match_date,
        status
      )
    `
    )
    .eq("team_member_id", teamMember.id);

  if (recordsError || !records) {
    return {
      totalMatches: 0,
      totalGoals: 0,
      totalAssists: 0,
      totalMOM: 0,
      totalCleanSheets: 0,
      averageQuarters: 0,
    };
  }

  // 완료된 경기 중 해당 연도만 필터링
  const filteredRecords = records.filter((r: any) => {
    if (r.match?.status !== "FINISHED") return false;
    const matchYear = new Date(r.match.match_date).getFullYear();
    return matchYear === year;
  });

  const totalMatches = filteredRecords.length;
  const totalGoals = filteredRecords.reduce((sum: number, r: any) => sum + (r.goals || 0), 0);
  const totalAssists = filteredRecords.reduce((sum: number, r: any) => sum + (r.assists || 0), 0);
  const totalMOM = filteredRecords.filter((r: any) => r.is_mom).length;
  const totalCleanSheets = filteredRecords.filter((r: any) => r.clean_sheet).length;
  const totalQuarters = filteredRecords.reduce(
    (sum: number, r: any) => sum + (r.quarters_played || 0),
    0
  );
  const averageQuarters =
    totalMatches > 0 ? Math.round((totalQuarters / totalMatches) * 10) / 10 : 0;

  return {
    totalMatches,
    totalGoals,
    totalAssists,
    totalMOM,
    totalCleanSheets,
    averageQuarters,
  };
}

/**
 * 특정 연도의 플레이어 최근 경기 기록을 가져옵니다
 * @param userId - 사용자 ID
 * @param teamId - 팀 ID
 * @param year - 연도
 * @returns 해당 연도의 경기 기록
 */
export async function getRecentMatchesByYear(
  userId: string,
  teamId: string,
  year: number
): Promise<RecentMatch[]> {
  const supabase = await createClient();

  // team_member_id 찾기
  const { data: teamMember, error: memberError } = await supabase
    .from("team_members")
    .select("id")
    .eq("user_id", userId)
    .eq("team_id", teamId)
    .eq("status", "active")
    .single();

  if (memberError || !teamMember) {
    return [];
  }

  // 경기 기록과 매치 정보 가져오기
  const { data: records, error: recordsError } = await supabase
    .from("match_records")
    .select(
      `
      *,
      match:matches!match_records_match_id_fkey(
        id,
        match_date,
        opponent_name,
        home_score,
        away_score,
        status
      )
    `
    )
    .eq("team_member_id", teamMember.id)
    .order("created_at", { ascending: false });

  if (recordsError || !records) {
    return [];
  }

  // 완료된 경기 중 해당 연도만 필터링 및 매핑
  return records
    .filter((r: any) => {
      if (r.match?.status !== "FINISHED") return false;
      const matchYear = new Date(r.match.match_date).getFullYear();
      return matchYear === year;
    })
    .map((record: any) => {
      const homeScore = record.match.home_score || 0;
      const awayScore = record.match.away_score || 0;

      let result: "승" | "무" | "패";
      if (homeScore > awayScore) result = "승";
      else if (homeScore < awayScore) result = "패";
      else result = "무";

      // 간단한 평점 계산 (골 + 도움 + 출전 쿼터 기반)
      const goalsWeight = (record.goals || 0) * 1.5;
      const assistsWeight = (record.assists || 0) * 1.0;
      const quartersWeight = (record.quarters_played || 0) * 0.3;
      const baseRating = 6.0;
      const rating = Math.min(
        10,
        Math.round((baseRating + goalsWeight + assistsWeight + quartersWeight) * 10) /
          10
      );

      return {
        matchId: record.match.id,
        matchDate: record.match.match_date,
        opponentName: record.match.opponent_name,
        result,
        homeScore,
        awayScore,
        goals: record.goals || 0,
        assists: record.assists || 0,
        quartersPlayed: record.quarters_played || 0,
        rating,
      };
    });
}

export async function getPlayerByTeamMemberId(
  teamMemberId: string
): Promise<PlayerWithStats | null> {
  const supabase = await createClient();

  // 팀 멤버 정보 가져오기
  const { data: teamMember, error: memberError } = await supabase
    .from("team_members")
    .select("*, user:users(id, nickname, avatar_url, position, birth_date, nationality, preferred_foot)")
    .eq("id", teamMemberId)
    .single();

  if (memberError || !teamMember) {
    return null;
  }

  // userId가 없으면 (용병인 경우) 기본 통계 반환 (완료된 경기만)
  if (!teamMember.user_id) {
    const { data: records } = await supabase
      .from("match_records")
      .select(`
        *,
        match:matches!match_records_match_id_fkey(
          id,
          status
        )
      `)
      .eq("team_member_id", teamMemberId);

    // 완료된 경기만 필터링
    const finishedRecords = records?.filter(
      (r: any) => r.match?.status === "FINISHED"
    ) || [];

    const totalMatches = finishedRecords.length;
    const totalGoals = finishedRecords.reduce((sum: number, r: any) => sum + (r.goals || 0), 0);
    const totalAssists = finishedRecords.reduce((sum: number, r: any) => sum + (r.assists || 0), 0);
    const totalMOM = finishedRecords.filter((r: any) => r.is_mom).length;
    const totalCleanSheets = finishedRecords.filter((r: any) => r.clean_sheet).length;
    const totalQuarters = finishedRecords.reduce(
      (sum: number, r: any) => sum + (r.quarters_played || 0),
      0
    );
    const averageQuarters =
      totalMatches > 0 ? Math.round((totalQuarters / totalMatches) * 10) / 10 : 0;

    return {
      teamMember: teamMember as TeamMember,
      user: null,
      stats: {
        totalMatches,
        totalGoals,
        totalAssists,
        totalMOM,
        totalCleanSheets,
        averageQuarters,
      },
    };
  }

  // 일반 사용자의 경우 통계 가져오기
  const stats = await getPlayerStats(teamMember.user_id, teamMember.team_id);

  return {
    teamMember: teamMember as TeamMember,
    user: teamMember.user as Pick<
      User,
      "id" | "nickname" | "avatar_url" | "position" | "birth_date" | "nationality" | "preferred_foot"
    > | null,
    stats,
  };
}
