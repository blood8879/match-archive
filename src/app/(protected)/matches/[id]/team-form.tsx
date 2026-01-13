import { TrendingUp } from "lucide-react";
import type { TeamForm } from "@/services/matches";
import Link from "next/link";

interface TeamFormSectionProps {
  homeTeamForm: TeamForm | null;
  awayTeamForm: TeamForm | null;
  isGuestOpponent?: boolean;
}

function FormBadge({ result }: { result: "W" | "D" | "L" }) {
  const config = {
    W: {
      bg: "bg-[#00e677]",
      text: "text-white",
      label: "승",
    },
    D: {
      bg: "bg-[#8eccae]",
      text: "text-[#0f2319]",
      label: "무",
    },
    L: {
      bg: "bg-red-500",
      text: "text-white",
      label: "패",
    },
  };

  const { bg, text, label } = config[result];

  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${bg} ${text} text-xs font-bold`}
    >
      {label}
    </span>
  );
}

function TeamFormCard({ form, label }: { form: TeamForm; label: "HOME" | "AWAY" }) {
  const isHome = label === "HOME";
  const displayLabel = isHome ? "홈" : "원정";

  return (
    <div className="flex-1">
      {/* 팀 헤더 */}
      <div className={`flex items-center gap-3 mb-4 ${isHome ? "" : "flex-row-reverse"}`}>
        <div className="size-10 rounded-full bg-[#214a36] flex items-center justify-center border border-[#2f6a4d] overflow-hidden">
          {form.teamEmblemUrl ? (
            <img
              src={form.teamEmblemUrl}
              alt={form.teamName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-bold text-[#8eccae]">
              {form.teamName.charAt(0)}
            </span>
          )}
        </div>
        <div className={isHome ? "" : "text-right"}>
          <p className="text-white font-bold text-sm">{form.teamName}</p>
          <p className="text-[#8eccae] text-xs">{displayLabel}</p>
        </div>
      </div>

      {/* Form 뱃지 */}
      <div className={`flex gap-1.5 mb-4 ${isHome ? "" : "justify-end"}`}>
        {form.recentForm.length > 0 ? (
          form.recentForm.map((result, idx) => (
            <FormBadge key={idx} result={result} />
          ))
        ) : (
          <span className="text-[#8eccae] text-xs">최근 경기 없음</span>
        )}
      </div>

      {/* 통계 요약 */}
      {form.recentForm.length > 0 && (
        <div className={`flex gap-4 text-xs ${isHome ? "" : "justify-end"}`}>
          <div className="text-center">
            <p className="text-[#00e677] font-bold text-lg">{form.stats.wins}</p>
            <p className="text-[#8eccae]">승</p>
          </div>
          <div className="text-center">
            <p className="text-[#8eccae] font-bold text-lg">{form.stats.draws}</p>
            <p className="text-[#8eccae]">무</p>
          </div>
          <div className="text-center">
            <p className="text-red-400 font-bold text-lg">{form.stats.losses}</p>
            <p className="text-[#8eccae]">패</p>
          </div>
        </div>
      )}

      {/* 최근 경기 목록 */}
      {form.matches.length > 0 && (
        <div className="mt-4 space-y-2">
          {form.matches.map((match) => (
            <Link
              key={match.id}
              href={`/matches/${match.id}`}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-[#162e23] hover:bg-[#1e3a2c] transition-colors ${
                isHome ? "" : "flex-row-reverse"
              }`}
            >
              <FormBadge result={match.result} />
              <div className={`flex-1 min-w-0 ${isHome ? "" : "text-right"}`}>
                <p className="text-white text-xs font-medium truncate">
                  vs {match.opponentName}
                </p>
                <p className="text-[#8eccae] text-[10px]">
                  {match.homeScore} - {match.awayScore}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function TeamFormSection({ homeTeamForm, awayTeamForm, isGuestOpponent = false }: TeamFormSectionProps) {
  // 둘 다 없으면 렌더링하지 않음
  if (!homeTeamForm && !awayTeamForm) {
    return null;
  }

  return (
    <section className="glass-panel rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[#214a36] bg-[#162e23]/50 flex items-center gap-2">
        <div className="p-1 bg-[#00e677]/20 rounded-md">
          <TrendingUp className="h-4 w-4 text-[#00e677]" />
        </div>
        <h3 className="text-white text-sm font-bold">최근 전적</h3>
        <span className="text-xs text-[#8eccae]">최근 5경기</span>
      </div>

      <div className="p-5">
        <div className="flex gap-6">
          {/* Home Team Form */}
          <div className="flex-1">
            {homeTeamForm ? (
              <TeamFormCard form={homeTeamForm} label="HOME" />
            ) : (
              <div className="text-center py-8">
                <p className="text-[#8eccae] text-sm">경기 기록 없음</p>
              </div>
            )}
          </div>

          {/* 구분선 */}
          <div className="w-px bg-[#214a36]" />

          {/* Away Team Form */}
          <div className="flex-1">
            {awayTeamForm ? (
              <TeamFormCard form={awayTeamForm} label="AWAY" />
            ) : (
              <div className="text-center py-8">
                <p className="text-[#8eccae] text-sm">
                  {isGuestOpponent
                    ? "게스트팀은 최근 경기 전적을 제공하지 않습니다."
                    : "경기 기록 없음"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
