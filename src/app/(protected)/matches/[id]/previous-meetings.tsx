import { History, Shield } from "lucide-react";
import type { HeadToHeadStats } from "@/services/matches";
import Link from "next/link";
import Image from "next/image";

interface PreviousMeetingsProps {
  stats: HeadToHeadStats;
  teamName: string;
  opponentName: string;
  teamEmblemUrl?: string | null;
  opponentEmblemUrl?: string | null;
}

function TeamEmblem({ url, name, size = 40 }: { url?: string | null; name: string; size?: number }) {
  if (url) {
    return (
      <div 
        className="relative rounded-full overflow-hidden flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <Image
          src={url}
          alt={name}
          fill
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className="rounded-full bg-[#214a36] flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <Shield className="text-[#8eccae]" style={{ width: size * 0.5, height: size * 0.5 }} />
    </div>
  );
}

export function PreviousMeetings({
  stats,
  teamName,
  opponentName,
  teamEmblemUrl,
  opponentEmblemUrl,
}: PreviousMeetingsProps) {
  if (stats.totalMatches === 0) {
    return (
      <section className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-6 py-5 text-center">
          <div className="inline-flex items-center justify-center p-2 bg-[#00e677]/10 rounded-xl mb-3">
            <History className="h-5 w-5 text-[#00e677]" />
          </div>
          <h3 className="text-white text-lg font-bold mb-2">상대 전적</h3>
          <p className="text-[#8eccae] text-sm">
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
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <TeamEmblem url={teamEmblemUrl} name={teamName} size={44} />
          <div className="text-center">
            <h3 className="text-white text-lg font-bold">상대 전적</h3>
            <p className="text-[#8eccae] text-xs mt-0.5">총 {stats.totalMatches}경기</p>
          </div>
          <TeamEmblem url={opponentEmblemUrl} name={opponentName} size={44} />
        </div>

        <div className="h-2 rounded-full overflow-hidden flex bg-[#162e23]">
          {homeWinRate > 0 && (
            <div
              className="bg-[#00e677] transition-all duration-500"
              style={{ width: `${homeWinRate}%` }}
            />
          )}
          {drawRate > 0 && (
            <div
              className="bg-[#8eccae]/60 transition-all duration-500"
              style={{ width: `${drawRate}%` }}
            />
          )}
          {awayWinRate > 0 && (
            <div
              className="bg-red-500 transition-all duration-500"
              style={{ width: `${awayWinRate}%` }}
            />
          )}
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-end gap-3">
            <div className="text-left">
              <p className="text-[10px] text-[#8eccae]/70 mb-0.5">승리</p>
              <p className="text-3xl font-black text-[#00e677]">{stats.homeWins}</p>
            </div>
            <div className="text-left pb-0.5">
              <p className="text-[10px] text-[#8eccae]/50 mb-0.5">홈</p>
              <p className="text-sm font-semibold text-[#00e677]/70">{stats.homeWinsAtHome}</p>
            </div>
            <div className="text-left pb-0.5">
              <p className="text-[10px] text-[#8eccae]/50 mb-0.5">원정</p>
              <p className="text-sm font-semibold text-[#00e677]/70">{stats.homeWinsAway}</p>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-[10px] text-[#8eccae]/70 mb-0.5">무승부</p>
            <p className="text-3xl font-black text-[#8eccae]">{stats.draws}</p>
          </div>
          
          <div className="flex items-end gap-3">
            <div className="text-right pb-0.5">
              <p className="text-[10px] text-[#8eccae]/50 mb-0.5">원정</p>
              <p className="text-sm font-semibold text-red-400/70">{stats.awayWinsAway}</p>
            </div>
            <div className="text-right pb-0.5">
              <p className="text-[10px] text-[#8eccae]/50 mb-0.5">홈</p>
              <p className="text-sm font-semibold text-red-400/70">{stats.awayWinsAtHome}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#8eccae]/70 mb-0.5">승리</p>
              <p className="text-3xl font-black text-red-400">{stats.awayWins}</p>
            </div>
          </div>
        </div>

        {stats.recentMatches.length > 0 && (
          <div className="pt-4 border-t border-[#214a36]/50">
            <div className="space-y-2">
              {stats.recentMatches.map((match) => (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}`}
                  className="flex items-center justify-between py-3 hover:bg-[#162e23]/50 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <TeamEmblem url={teamEmblemUrl} name={teamName} size={28} />
                    <span className="text-sm text-white truncate">{teamName}</span>
                  </div>
                  
                  <div className="flex flex-col items-center px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-white">{match.homeScore}</span>
                      <span className="text-[#8eccae]/50 text-sm">-</span>
                      <span className="text-lg font-bold text-white">{match.awayScore}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        match.isHome 
                          ? "bg-[#00e677]/15 text-[#00e677]" 
                          : "bg-[#8eccae]/15 text-[#8eccae]"
                      }`}>
                        {match.isHome ? "H" : "A"}
                      </span>
                      <span className="text-[10px] text-[#8eccae]/50">
                        {new Date(match.date).toLocaleDateString("ko-KR", {
                          month: "numeric",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className="text-sm text-white truncate">{opponentName}</span>
                    <TeamEmblem url={opponentEmblemUrl} name={opponentName} size={28} />
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
