import { History, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { HeadToHeadStats } from "@/services/matches";
import Link from "next/link";

interface PreviousMeetingsProps {
  stats: HeadToHeadStats;
  teamName: string;
  opponentName: string;
}

export function PreviousMeetings({
  stats,
  teamName,
  opponentName,
}: PreviousMeetingsProps) {
  if (stats.totalMatches === 0) {
    return (
      <section className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#214a36] bg-[#162e23]/50 flex items-center gap-2">
          <div className="p-1 bg-[#00e677]/20 rounded-md">
            <History className="h-4 w-4 text-[#00e677]" />
          </div>
          <h3 className="text-white text-sm font-bold">상대 전적</h3>
        </div>
        <div className="p-5">
          <p className="text-center text-[#8eccae] text-sm py-4">
            {opponentName}과의 이전 경기 기록이 없습니다
          </p>
        </div>
      </section>
    );
  }

  const totalGames = stats.homeWins + stats.awayWins + stats.draws;
  const homeWinRate = totalGames > 0 ? (stats.homeWins / totalGames) * 100 : 0;
  const awayWinRate = totalGames > 0 ? (stats.awayWins / totalGames) * 100 : 0;
  const drawRate = totalGames > 0 ? (stats.draws / totalGames) * 100 : 0;

  return (
    <section className="glass-panel rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[#214a36] bg-[#162e23]/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-[#00e677]/20 rounded-md">
            <History className="h-4 w-4 text-[#00e677]" />
          </div>
          <h3 className="text-white text-sm font-bold">상대 전적</h3>
        </div>
        <span className="text-xs text-[#8eccae]">
          총 {stats.totalMatches}경기
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* 승/무/패 통계 바 */}
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-[#00e677] font-bold">{teamName}</span>
            <span className="text-[#8eccae]">무</span>
            <span className="text-red-400 font-bold">{opponentName}</span>
          </div>

          {/* 프로그레스 바 */}
          <div className="h-3 rounded-full overflow-hidden flex bg-[#162e23]">
            {homeWinRate > 0 && (
              <div
                className="bg-[#00e677] transition-all"
                style={{ width: `${homeWinRate}%` }}
              />
            )}
            {drawRate > 0 && (
              <div
                className="bg-[#8eccae]/50 transition-all"
                style={{ width: `${drawRate}%` }}
              />
            )}
            {awayWinRate > 0 && (
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${awayWinRate}%` }}
              />
            )}
          </div>

          {/* 숫자 표시 */}
          <div className="flex items-center justify-between mt-2">
            <div className="text-center">
              <p className="text-2xl font-black text-[#00e677]">{stats.homeWins}</p>
              <p className="text-xs text-[#8eccae]">승</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-[#8eccae]">{stats.draws}</p>
              <p className="text-xs text-[#8eccae]">무</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-red-400">{stats.awayWins}</p>
              <p className="text-xs text-[#8eccae]">패</p>
            </div>
          </div>
        </div>

        {/* 득점 통계 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#162e23] rounded-lg p-3 text-center">
            <p className="text-xs text-[#8eccae] mb-1">우리팀 총 득점</p>
            <p className="text-xl font-bold text-[#00e677]">{stats.homeGoals}</p>
          </div>
          <div className="bg-[#162e23] rounded-lg p-3 text-center">
            <p className="text-xs text-[#8eccae] mb-1">상대팀 총 득점</p>
            <p className="text-xl font-bold text-red-400">{stats.awayGoals}</p>
          </div>
        </div>

        {/* 최근 경기 결과 */}
        {stats.recentMatches.length > 0 && (
          <div>
            <p className="text-xs text-[#8eccae] mb-2">최근 경기</p>
            <div className="space-y-2">
              {stats.recentMatches.map((match) => (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}`}
                  className="flex items-center justify-between bg-[#162e23] hover:bg-[#1e3a2c] rounded-lg px-3 py-2 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {match.result === "W" ? (
                      <TrendingUp className="w-4 h-4 text-[#00e677]" />
                    ) : match.result === "L" ? (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    ) : (
                      <Minus className="w-4 h-4 text-[#8eccae]" />
                    )}
                    <span className="text-xs text-[#8eccae]">
                      {new Date(match.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">
                      {match.homeScore} - {match.awayScore}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        match.result === "W"
                          ? "bg-[#00e677]/20 text-[#00e677]"
                          : match.result === "L"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-[#8eccae]/20 text-[#8eccae]"
                      }`}
                    >
                      {match.result === "W" ? "승" : match.result === "L" ? "패" : "무"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
