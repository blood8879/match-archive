"use client";

import { useState } from "react";
import {
  BarChart3,
  Calendar,
  Trophy,
  Users,
  Target,
  Shield,
  ChevronDown,
  X,
  Award,
  Lock,
} from "lucide-react";
import type { MonthlyStats, RecentMatch, SeasonStats } from "@/services/player-stats";
import type { BadgeType } from "@/types/supabase";

type BadgeWithStatus = {
  type: BadgeType;
  name: string;
  description: string;
  icon: string;
  color: string;
  earned: boolean;
  earnedAt?: string;
};

interface PlayerStatsTabsProps {
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
  careerStats: SeasonStats[];
  currentYear: number;
  allSeasonStats: Record<number, {
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
  }>;
  availableSeasons: number[];
  badges: BadgeWithStatus[];
}

export function PlayerStatsTabs({
  stats: initialStats,
  monthlyStats: initialMonthlyStats,
  recentMatches: initialRecentMatches,
  careerStats,
  currentYear,
  allSeasonStats,
  availableSeasons,
  badges,
}: PlayerStatsTabsProps) {
  const [activeTab, setActiveTab] = useState<"season" | "matches" | "badges">("season");
  
  const earnedBadges = badges.filter(b => b.earned);
  const unearnedBadges = badges.filter(b => !b.earned);
  const [selectedSeason, setSelectedSeason] = useState(currentYear);
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);

  // 선택된 시즌의 데이터 가져오기
  const seasonData = allSeasonStats[selectedSeason] || {
    stats: initialStats,
    monthlyStats: initialMonthlyStats,
    recentMatches: initialRecentMatches,
  };

  const stats = seasonData.stats;
  const monthlyStats = seasonData.monthlyStats;
  const recentMatches = seasonData.recentMatches;

  // 차트 최대값 계산
  const maxValue = Math.max(
    ...monthlyStats.map((m) => m.goals + m.assists),
    1
  );

  // 커리어 총계 계산
  const careerTotals = careerStats.reduce(
    (acc, season) => ({
      matches: acc.matches + season.matches,
      goals: acc.goals + season.goals,
      assists: acc.assists + season.assists,
      mom: acc.mom + season.mom,
      cleanSheets: acc.cleanSheets + season.cleanSheets,
    }),
    { matches: 0, goals: 0, assists: 0, mom: 0, cleanSheets: 0 }
  );

  const handleSeasonSelect = (season: number) => {
    setSelectedSeason(season);
    setIsSeasonModalOpen(false);
  };

  // 모든 시즌의 경기 기록 합치기 (최신 순)
  const allMatches = Object.entries(allSeasonStats)
    .flatMap(([, data]) => data.recentMatches)
    .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime());

  return (
    <div>
      {/* Season Select Modal */}
      {isSeasonModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsSeasonModalOpen(false)}
          />

          {/* Side Panel */}
          <div className="relative w-80 max-w-full bg-[#0f2319] border-l border-[#214a36] h-full overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-[#0f2319] border-b border-[#214a36] p-4 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">시즌 선택</h3>
              <button
                onClick={() => setIsSeasonModalOpen(false)}
                className="p-2 hover:bg-[#214a36] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[#8eccae]" />
              </button>
            </div>

            <div className="p-4 space-y-2">
              {availableSeasons.map((season) => (
                <label
                  key={season}
                  className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${
                    selectedSeason === season
                      ? "bg-primary/20 border border-primary"
                      : "bg-[#162e23] border border-transparent hover:border-[#214a36]"
                  }`}
                  onClick={() => handleSeasonSelect(season)}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedSeason === season
                      ? "border-primary"
                      : "border-[#8eccae]"
                  }`}>
                    {selectedSeason === season && (
                      <div className="w-3 h-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className={`font-medium ${
                    selectedSeason === season ? "text-white" : "text-[#8eccae]"
                  }`}>
                    {season}년 시즌
                  </span>
                  {season === currentYear && (
                    <span className="ml-auto px-2 py-0.5 bg-primary/20 text-primary text-xs rounded">
                      현재
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Career Stats Summary - 통산 기록 카드 */}
      <div className="mb-8 bg-gradient-to-r from-[#162e23] to-[#0f2319] rounded-2xl p-5 border border-[#2d5842]/50">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h3 className="text-white font-bold">통산 기록</h3>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-black text-white">{careerTotals.matches}</div>
            <div className="text-xs text-text-secondary">경기</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-black text-primary">{careerTotals.goals}</div>
            <div className="text-xs text-text-secondary">득점</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-black text-[#8eccae]">{careerTotals.assists}</div>
            <div className="text-xs text-text-secondary">도움</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-black text-yellow-500">{careerTotals.mom}</div>
            <div className="text-xs text-text-secondary">MOM</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-black text-blue-400">{careerTotals.cleanSheets}</div>
            <div className="text-xs text-text-secondary">클린시트</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("season")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === "season"
              ? "bg-primary text-[#0f2319]"
              : "bg-[#214a36] text-[#8eccae] hover:bg-[#2b5d45]"
          }`}
        >
          시즌별 기록
        </button>
        <button
          onClick={() => setActiveTab("matches")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === "matches"
              ? "bg-primary text-[#0f2319]"
              : "bg-[#214a36] text-[#8eccae] hover:bg-[#2b5d45]"
          }`}
        >
          경기 기록
        </button>
        <button
          onClick={() => setActiveTab("badges")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
            activeTab === "badges"
              ? "bg-primary text-[#0f2319]"
              : "bg-[#214a36] text-[#8eccae] hover:bg-[#2b5d45]"
          }`}
        >
          <Award className="w-4 h-4" />
          업적
          {earnedBadges.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === "badges" ? "bg-[#0f2319]/30" : "bg-primary/20 text-primary"
            }`}>
              {earnedBadges.length}
            </span>
          )}
        </button>
      </div>

      {/* Season Stats Tab */}
      {activeTab === "season" && (
        <>
          {/* Stats Grid */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                {selectedSeason} 시즌 스탯
              </h3>

              {/* Season Selector Button */}
              <button
                onClick={() => setIsSeasonModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#214a36] hover:bg-[#2b5d45] rounded-lg transition-colors border border-[#2d5842]"
              >
                <span className="text-white text-sm font-medium">{selectedSeason}</span>
                <ChevronDown className="w-4 h-4 text-[#8eccae]" />
              </button>
            </div>

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
                  {selectedSeason} 시즌
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
                    {selectedSeason}년 시즌에 기록된 통계가 없습니다
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
                {selectedSeason}년 경기 기록
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
                      <th className="pb-3 font-medium text-center">공격P</th>
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
                            <span className={`font-bold ${match.goals + match.assists > 0 ? "text-primary" : "text-white/50"}`}>
                              {match.goals + match.assists}
                            </span>
                          </td>
                          <td className="py-4 pr-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {match.isMOM && (
                                <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs font-bold rounded">
                                  MOM
                                </span>
                              )}
                              <span className="text-text-secondary">{statsText}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-text-secondary py-8">
                {selectedSeason}년 시즌에 경기 기록이 없습니다
              </p>
            )}
          </section>
        </>
      )}

      {/* Badges Tab - 업적 */}
      {activeTab === "badges" && (
        <div className="space-y-8">
          {/* 획득한 업적 */}
          <section className="bg-card-dark rounded-2xl p-6 border border-[#2d5842]/30">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-lg font-bold flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                획득한 업적
              </h3>
              <span className="text-sm text-text-secondary">
                {earnedBadges.length}개 획득
              </span>
            </div>

            {earnedBadges.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {earnedBadges.map((badge) => (
                  <div
                    key={badge.type}
                    className={`p-4 rounded-xl border ${badge.color} transition-all hover:scale-105`}
                  >
                    <div className="text-3xl mb-2">{badge.icon}</div>
                    <h4 className="font-bold text-white text-sm mb-1">{badge.name}</h4>
                    <p className="text-xs text-text-secondary mb-2">{badge.description}</p>
                    {badge.earnedAt && (
                      <p className="text-[10px] text-text-secondary/70">
                        {new Date(badge.earnedAt).toLocaleDateString("ko-KR")} 획득
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Award className="w-12 h-12 text-text-secondary/30 mx-auto mb-3" />
                <p className="text-text-secondary">아직 획득한 업적이 없습니다</p>
                <p className="text-xs text-text-secondary/70 mt-1">경기에 참여하고 기록을 쌓아 업적을 획득하세요!</p>
              </div>
            )}
          </section>

          {/* 미획득 업적 */}
          {unearnedBadges.length > 0 && (
            <section className="bg-card-dark rounded-2xl p-6 border border-[#2d5842]/30">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white text-lg font-bold flex items-center gap-2">
                  <Lock className="w-5 h-5 text-text-secondary" />
                  도전 가능한 업적
                </h3>
                <span className="text-sm text-text-secondary">
                  {unearnedBadges.length}개 남음
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {unearnedBadges.map((badge) => (
                  <div
                    key={badge.type}
                    className="p-4 rounded-xl border border-[#2d5842]/30 bg-[#0f2319]/50 opacity-60 transition-all hover:opacity-80"
                  >
                    <div className="text-3xl mb-2 grayscale">{badge.icon}</div>
                    <h4 className="font-bold text-text-secondary text-sm mb-1">{badge.name}</h4>
                    <p className="text-xs text-text-secondary/70">{badge.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Matches Tab - 전체 경기 기록 */}
      {activeTab === "matches" && (
        <section className="bg-card-dark rounded-2xl p-6 border border-[#2d5842]/30">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white text-lg font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              전체 경기 기록
            </h3>
            <span className="text-sm text-text-secondary">
              총 {allMatches.length}경기
            </span>
          </div>

          {allMatches.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-text-secondary text-xs uppercase tracking-wider border-b border-[#2d5842]">
                    <th className="pb-3 pl-2 font-medium">날짜</th>
                    <th className="pb-3 font-medium">상대팀</th>
                    <th className="pb-3 font-medium text-center">결과</th>
                    <th className="pb-3 font-medium text-center">공격P</th>
                    <th className="pb-3 pr-2 font-medium text-right">스탯</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {allMatches.map((match, index) => {
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
                        key={`${match.matchId}-${index}`}
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
                          <span className={`font-bold ${match.goals + match.assists > 0 ? "text-primary" : "text-white/50"}`}>
                            {match.goals + match.assists}
                          </span>
                        </td>
                        <td className="py-4 pr-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {match.isMOM && (
                              <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs font-bold rounded">
                                MOM
                              </span>
                            )}
                            <span className="text-text-secondary">{statsText}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-text-secondary py-8">
              경기 기록이 없습니다
            </p>
          )}
        </section>
      )}

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
