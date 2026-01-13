import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getPlayerByTeamMemberId,
  getMonthlyStats,
  getRecentMatches,
  getCareerStats,
  getPlayerStatsByYear,
  getRecentMatchesByYear,
} from "@/services/player-stats";
import type { MonthlyStats, RecentMatch } from "@/services/player-stats";
import { ArrowLeft } from "lucide-react";
import { PlayerStatsTabs } from "./player-stats-tabs";

interface PlayerPageProps {
  params: Promise<{
    teamMemberId: string;
  }>;
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { teamMemberId } = await params;

  const playerData = await getPlayerByTeamMemberId(teamMemberId);

  if (!playerData) {
    notFound();
  }

  const { teamMember, user, stats } = playerData;

  // 월별 통계 가져오기 (현재 연도)
  const currentYear = new Date().getFullYear();
  const monthlyStats = user
    ? await getMonthlyStats(user.id, teamMember.team_id, currentYear)
    : [];

  // 최근 경기 기록 가져오기
  const recentMatches = user
    ? await getRecentMatches(user.id, teamMember.team_id, 10)
    : [];

  // 커리어 통계 가져오기
  const careerStats = user
    ? await getCareerStats(user.id, teamMember.team_id)
    : [];

  // 모든 시즌의 데이터 가져오기
  const availableSeasons = careerStats.map((s) => s.season);
  const allSeasonStats: Record<
    number,
    {
      stats: {
        totalMatches: number;
        totalGoals: number;
        totalAssists: number;
        totalMOM: number;
        totalCleanSheets: number;
        averageQuarters: number;
      };
      monthlyStats: MonthlyStats[];
      recentMatches: RecentMatch[];
    }
  > = {};

  if (user) {
    // 각 시즌별 데이터를 병렬로 가져오기
    const seasonDataPromises = availableSeasons.map(async (year) => {
      const [seasonStats, seasonMonthlyStats, seasonRecentMatches] =
        await Promise.all([
          getPlayerStatsByYear(user.id, teamMember.team_id, year),
          getMonthlyStats(user.id, teamMember.team_id, year),
          getRecentMatchesByYear(user.id, teamMember.team_id, year),
        ]);

      return {
        year,
        stats: seasonStats,
        monthlyStats: seasonMonthlyStats,
        recentMatches: seasonRecentMatches,
      };
    });

    const seasonDataResults = await Promise.all(seasonDataPromises);

    seasonDataResults.forEach((data) => {
      allSeasonStats[data.year] = {
        stats: data.stats,
        monthlyStats: data.monthlyStats,
        recentMatches: data.recentMatches,
      };
    });
  }

  const displayName =
    teamMember.is_guest && teamMember.guest_name
      ? teamMember.guest_name
      : user?.nickname || "알 수 없음";

  const position = teamMember.is_guest ? "용병" : user?.position || "-";
  const avatarUrl = user?.avatar_url;
  const backNumber = teamMember.back_number;

  return (
    <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 py-6 md:px-8">
      {/* Back Button */}
      <Link
        href={`/teams/${teamMember.team_id}`}
        className="flex items-center gap-2 text-[#8eccae] hover:text-[#00e677] transition-colors text-sm w-fit mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>팀 페이지로 돌아가기</span>
      </Link>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <a
          className="text-text-secondary hover:text-white transition-colors"
          href="/dashboard"
        >
          홈
        </a>
        <span className="text-text-secondary">/</span>
        <a
          className="text-text-secondary hover:text-white transition-colors"
          href="/teams"
        >
          팀 목록
        </a>
        <span className="text-text-secondary">/</span>
        <span className="text-white font-medium">{displayName}</span>
      </div>

      {/* Profile Header */}
      <section className="bg-card-dark rounded-2xl p-6 mb-8 relative overflow-hidden group">
        {/* Decorative Background Element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start relative z-10">
          <div className="relative">
            {avatarUrl ? (
              <div
                className="bg-center bg-no-repeat bg-cover rounded-full size-32 md:size-40 border-4 border-[#10231a] shadow-xl"
                style={{ backgroundImage: `url(${avatarUrl})` }}
              />
            ) : (
              <div className="flex items-center justify-center rounded-full size-32 md:size-40 border-4 border-[#10231a] shadow-xl bg-surface-800 text-4xl font-bold text-white">
                {displayName.charAt(0)}
              </div>
            )}
            {backNumber && (
              <div className="absolute -bottom-2 -right-2 bg-primary text-background-dark font-bold rounded-full size-10 md:size-12 flex items-center justify-center border-4 border-[#10231a] text-lg">
                {backNumber}
              </div>
            )}
          </div>

          <div className="flex-1 text-center md:text-left pt-2">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
              <h1 className="text-3xl font-bold text-white tracking-tight">
                {displayName}
              </h1>
              <span className="hidden md:inline text-text-secondary">|</span>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="bg-[#10231a] text-primary px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                  {position}
                </span>
              </div>
            </div>

            <p className="text-text-secondary max-w-2xl mb-6 text-sm leading-relaxed">
              {teamMember.is_guest
                ? "이 경기에 참가한 용병 선수입니다."
                : `총 ${stats.totalMatches}경기 출전, ${stats.totalGoals}골 ${stats.totalAssists}도움을 기록한 선수입니다.`}
            </p>
          </div>
        </div>
      </section>

      {/* Tabs Component */}
      <PlayerStatsTabs
        stats={stats}
        monthlyStats={monthlyStats}
        recentMatches={recentMatches}
        careerStats={careerStats}
        currentYear={currentYear}
        allSeasonStats={allSeasonStats}
        availableSeasons={availableSeasons}
      />
    </main>
  );
}
