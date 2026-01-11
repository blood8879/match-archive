import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getPlayerByTeamMemberId,
  getMonthlyStats,
  getRecentMatches,
} from "@/services/player-stats";
import { BarChart3, Calendar, Trophy, Users, Target, Shield, ArrowLeft } from "lucide-react";

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

  const displayName =
    teamMember.is_guest && teamMember.guest_name
      ? teamMember.guest_name
      : user?.nickname || "알 수 없음";

  const position = teamMember.is_guest ? "용병" : user?.position || "-";
  const avatarUrl = user?.avatar_url;
  const backNumber = teamMember.back_number;

  // 차트 최대값 계산
  const maxValue = Math.max(
    ...monthlyStats.map((m) => m.goals + m.assists),
    1
  );

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

      {/* Stats Grid */}
      <section className="mb-8">
        <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          핵심 스탯
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Matches */}
          <div className="bg-card-dark p-5 rounded-2xl border border-transparent hover:border-primary/30 transition-colors group">
            <div className="flex justify-between items-start mb-2">
              <span className="text-text-secondary text-sm font-medium">
                경기 수
              </span>
              <Users className="w-5 h-5 text-primary/40 group-hover:text-primary transition-colors" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-white">
                {stats.totalMatches}
              </span>
            </div>
          </div>

          {/* Goals */}
          <div className="bg-card-dark p-5 rounded-2xl border border-transparent hover:border-primary/30 transition-colors group relative overflow-hidden">
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Target className="w-16 h-16" />
            </div>
            <div className="flex justify-between items-start mb-2 relative z-10">
              <span className="text-text-secondary text-sm font-medium">
                득점
              </span>
              <Target className="w-5 h-5 text-primary/40 group-hover:text-primary transition-colors" />
            </div>
            <div className="flex items-end gap-2 relative z-10">
              <span className="text-3xl font-bold text-white">
                {stats.totalGoals}
              </span>
            </div>
          </div>

          {/* Assists */}
          <div className="bg-card-dark p-5 rounded-2xl border border-transparent hover:border-primary/30 transition-colors group">
            <div className="flex justify-between items-start mb-2">
              <span className="text-text-secondary text-sm font-medium">
                도움
              </span>
              <svg
                className="w-5 h-5 text-primary/40 group-hover:text-primary transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
                />
              </svg>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-white">
                {stats.totalAssists}
              </span>
            </div>
          </div>

          {/* MOM */}
          <div className="bg-card-dark p-5 rounded-2xl border border-transparent hover:border-primary/30 transition-colors group">
            <div className="flex justify-between items-start mb-2">
              <span className="text-text-secondary text-sm font-medium">
                MOM 선정
              </span>
              <Trophy className="w-5 h-5 text-primary/40 group-hover:text-primary transition-colors" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-white">
                {stats.totalMOM}
              </span>
            </div>
          </div>

          {/* Clean Sheets */}
          <div className="bg-card-dark p-5 rounded-2xl border border-transparent hover:border-primary/30 transition-colors group">
            <div className="flex justify-between items-start mb-2">
              <span className="text-text-secondary text-sm font-medium">
                클린 시트
              </span>
              <Shield className="w-5 h-5 text-primary/40 group-hover:text-primary transition-colors" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-white">
                {stats.totalCleanSheets}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Charts & Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 bg-card-dark rounded-2xl p-6 border border-[#2d5842]/30">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white text-lg font-bold">
              월별 공격 포인트 추이
            </h3>
            <div className="bg-[#10231a] text-white text-xs border border-[#2d5842] rounded-lg px-3 py-1.5">
              {currentYear} 시즌
            </div>
          </div>

          {monthlyStats.length > 0 ? (
            <div className="h-64 flex items-end justify-between gap-2 md:gap-4 px-2">
              {monthlyStats.map((stat) => {
                const total = stat.goals + stat.assists;
                const heightPercent = (total / maxValue) * 100;

                return (
                  <div
                    key={stat.month}
                    className="flex flex-col items-center gap-2 w-full group cursor-pointer"
                  >
                    <div className="relative w-full bg-[#10231a] rounded-t-lg h-48 flex items-end overflow-hidden">
                      <div
                        className="w-full bg-primary group-hover:bg-primary-dark transition-all rounded-t-lg relative"
                        style={{ height: `${heightPercent}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-background-dark text-xs font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                          {total}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-text-secondary group-hover:text-white">
                      {stat.month}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-text-secondary">
                아직 기록된 통계가 없습니다
              </p>
            </div>
          )}
        </div>

        {/* Side Widget: Season Summary */}
        <div className="flex flex-col gap-4">
          <div className="bg-card-dark rounded-2xl p-6 border border-[#2d5842]/30 flex-1">
            <h3 className="text-white text-lg font-bold mb-4">시즌 요약</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-sm">경기당 평균 득점</span>
                <span className="text-white font-bold">
                  {stats.totalMatches > 0
                    ? (stats.totalGoals / stats.totalMatches).toFixed(2)
                    : "0.00"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-sm">경기당 평균 도움</span>
                <span className="text-white font-bold">
                  {stats.totalMatches > 0
                    ? (stats.totalAssists / stats.totalMatches).toFixed(2)
                    : "0.00"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-sm">평균 출전 쿼터</span>
                <span className="text-white font-bold">
                  {stats.averageQuarters}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-sm">공격 포인트</span>
                <span className="text-primary font-bold text-lg">
                  {stats.totalGoals + stats.totalAssists}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Matches Table */}
      <section className="bg-card-dark rounded-2xl p-6 border border-[#2d5842]/30">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-lg font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            최근 경기 기록
          </h3>
        </div>

        {recentMatches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-text-secondary text-xs uppercase tracking-wider border-b border-[#2d5842]">
                  <th className="pb-3 pl-2 font-medium">날짜</th>
                  <th className="pb-3 font-medium">상대팀</th>
                  <th className="pb-3 font-medium text-center">결과</th>
                  <th className="pb-3 font-medium text-center">평점</th>
                  <th className="pb-3 pr-2 font-medium text-right">스탯</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {recentMatches.map((match) => {
                  const resultColor =
                    match.result === "승"
                      ? "bg-primary/20 text-primary"
                      : match.result === "패"
                      ? "bg-red-500/20 text-red-500"
                      : "bg-gray-500/20 text-gray-400";

                  const statsText =
                    match.goals > 0 || match.assists > 0
                      ? `${match.goals > 0 ? `${match.goals}골` : ""} ${
                          match.assists > 0 ? `${match.assists}도움` : ""
                        }`.trim()
                      : "-";

                  return (
                    <tr
                      key={match.matchId}
                      className="group hover:bg-[#10231a] transition-colors border-b border-[#2d5842]/50 last:border-0"
                    >
                      <td className="py-4 pl-2 text-white font-medium">
                        {new Date(match.matchDate).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </td>
                      <td className="py-4">
                        <span className="text-white">vs {match.opponentName}</span>
                      </td>
                      <td className="py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold ${resultColor}`}
                        >
                          {match.homeScore}-{match.awayScore} {match.result}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        <span className="font-bold text-white">
                          {match.rating}
                        </span>
                      </td>
                      <td className="py-4 pr-2 text-right text-text-secondary">
                        {statsText}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-text-secondary py-8">
            아직 경기 기록이 없습니다
          </p>
        )}
      </section>
    </main>
  );
}
