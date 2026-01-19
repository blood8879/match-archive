"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, Target, Star, Users, TrendingUp, Handshake, PieChartIcon, BarChart3, ChevronRight } from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { getTeamDetailedStats, type TeamDetailedStats, type PlayerRanking } from "@/services/team-stats";
import { getTeamById } from "@/services/teams";
import type { Team } from "@/types/supabase";

const COLORS = ["#00e677", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function TeamStatsPage() {
  const params = useParams();
  const teamId = params.id as string;
  
  const [team, setTeam] = useState<Team | null>(null);
  const [stats, setStats] = useState<TeamDetailedStats | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);
  const [showAllScorers, setShowAllScorers] = useState(false);
  const [showAllAssists, setShowAllAssists] = useState(false);
  const [showAllMom, setShowAllMom] = useState(false);
  const [showAllAppearances, setShowAllAppearances] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [teamData, statsData] = await Promise.all([
          getTeamById(teamId),
          getTeamDetailedStats(teamId, selectedYear),
        ]);
        setTeam(teamData);
        setStats(statsData);
      } catch (error) {
        console.error("Failed to load stats:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [teamId, selectedYear]);

  if (isLoading) {
    return (
      <main className="relative z-10 flex-1 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00e677]"></div>
        </div>
      </main>
    );
  }

  if (!team || !stats) {
    return (
      <main className="relative z-10 flex-1 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-white text-center">데이터를 불러올 수 없습니다.</p>
      </main>
    );
  }

  const renderRankingCard = (
    title: string,
    icon: React.ReactNode,
    data: PlayerRanking[],
    suffix: string,
    showAll: boolean,
    setShowAll: (v: boolean) => void
  ) => {
    const displayData = showAll ? data : data.slice(0, 5);
    
    return (
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            {icon}
            {title}
          </h3>
          {data.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-[#00e677] hover:underline flex items-center gap-1"
            >
              {showAll ? "접기" : "전체보기"}
              <ChevronRight className={`w-3 h-3 transition-transform ${showAll ? "rotate-90" : ""}`} />
            </button>
          )}
        </div>
        {displayData.length > 0 ? (
          <div className="space-y-3">
            {displayData.map((player, idx) => (
              <div key={player.memberId} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  idx === 0 ? "bg-yellow-500 text-black" :
                  idx === 1 ? "bg-gray-400 text-black" :
                  idx === 2 ? "bg-amber-700 text-white" :
                  "bg-white/10 text-white"
                }`}>
                  {idx + 1}
                </span>
                {player.avatarUrl ? (
                  <img src={player.avatarUrl} alt={player.name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#214a36] flex items-center justify-center text-[#00e677] text-xs font-bold">
                    {player.name.charAt(0)}
                  </div>
                )}
                <span className="text-white text-sm flex-1 truncate">{player.name}</span>
                <span className="text-[#00e677] font-bold">{player.value}{suffix}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm text-center py-4">데이터가 없습니다</p>
        )}
      </div>
    );
  };

  return (
    <main className="relative z-10 flex-1 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/teams/${teamId}`}
          className="flex items-center gap-2 text-[#8eccae] hover:text-[#00e677] transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>팀으로 돌아가기</span>
        </Link>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="bg-[#214a36] text-white px-4 py-2 rounded-lg border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#00e677]"
        >
          {years.map((year) => (
            <option key={year} value={year}>{year}년 시즌</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-4 mb-2">
        {team.emblem_url ? (
          <img src={team.emblem_url} alt={team.name} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[#214a36] flex items-center justify-center text-[#00e677] font-bold">
            {team.name.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-white">{team.name}</h1>
          <p className="text-[#8eccae] text-sm">{selectedYear}년 시즌 통계</p>
        </div>
      </div>

      {stats.totalGoals === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <BarChart3 className="w-16 h-16 text-[#8eccae] mx-auto mb-4" />
          <h3 className="text-white font-bold text-lg mb-2">{selectedYear}년 시즌 데이터가 없습니다</h3>
          <p className="text-[#8eccae] text-sm">경기 결과를 입력하면 통계가 표시됩니다.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                <PieChartIcon className="w-5 h-5 text-[#00e677]" />
                골 유형 분포
              </h3>
              {stats.goalTypeDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={stats.goalTypeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="type"
                      label={({ name, percent }) => `${name} ${Math.round((percent || 0) * 100)}%`}
                      labelLine={false}
                    >
                      {stats.goalTypeDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f2319", border: "1px solid #214a36", borderRadius: "8px" }}
                      itemStyle={{ color: "#fff" }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-sm text-center py-12">데이터가 없습니다</p>
              )}
            </div>

            <div className="glass-card rounded-xl p-5">
              <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-[#00e677]" />
                쿼터별 득점
              </h3>
              {stats.quarterGoals.some((q) => q.goals > 0) ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.quarterGoals} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <XAxis dataKey="quarter" stroke="#8eccae" />
                    <YAxis stroke="#8eccae" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f2319", border: "1px solid #214a36", borderRadius: "8px" }}
                      itemStyle={{ color: "#fff" }}
                    />
                    <Bar dataKey="goals" fill="#00e677" radius={[4, 4, 0, 0]} name="득점" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-sm text-center py-12">데이터가 없습니다</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {renderRankingCard("득점 순위", <Trophy className="w-5 h-5 text-yellow-500" />, stats.topScorers, "골", showAllScorers, setShowAllScorers)}
            {renderRankingCard("어시스트 순위", <Target className="w-5 h-5 text-blue-500" />, stats.topAssists, "도움", showAllAssists, setShowAllAssists)}
            {renderRankingCard("MOM 선정", <Star className="w-5 h-5 text-amber-500" />, stats.topMom, "회", showAllMom, setShowAllMom)}
            {renderRankingCard("출전 경기", <Users className="w-5 h-5 text-purple-500" />, stats.topAppearances, "경기", showAllAppearances, setShowAllAppearances)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                <Handshake className="w-5 h-5 text-[#00e677]" />
                영혼의 파트너 (득점-도움 조합)
              </h3>
              {stats.scorerAssistPairs.length > 0 ? (
                <div className="space-y-3">
                  {stats.scorerAssistPairs.map((pair, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? "bg-[#00e677] text-[#0f2319]" : "bg-white/10 text-white"
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="text-white font-medium">{pair.scorerName}</span>
                        <span className="text-[#8eccae] text-xs">골</span>
                        <span className="text-[#8eccae]">←</span>
                        <span className="text-white font-medium">{pair.assistName}</span>
                        <span className="text-[#8eccae] text-xs">도움</span>
                      </div>
                      <span className="text-[#00e677] font-bold">{pair.count}골</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-8">득점-도움 조합 데이터가 없습니다</p>
              )}
            </div>

            <div className="glass-card rounded-xl p-5">
              <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-[#00e677]" />
                득점 분포도
              </h3>
              {stats.goalDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={stats.goalDistribution.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name} ${value}%`}
                      labelLine={false}
                    >
                      {stats.goalDistribution.slice(0, 6).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f2319", border: "1px solid #214a36", borderRadius: "8px" }}
                      itemStyle={{ color: "#fff" }}
                      formatter={(value) => [`${value}%`, "득점 비율"]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-sm text-center py-12">데이터가 없습니다</p>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
