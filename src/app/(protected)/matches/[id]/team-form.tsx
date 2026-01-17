import { TrendingUp } from "lucide-react";
import type { TeamForm } from "@/services/matches";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface TeamFormSectionProps {
  homeTeamForm: TeamForm | null;
  awayTeamForm: TeamForm | null;
  isGuestOpponent?: boolean;
}

function ResultPill({ result, score }: { result: "W" | "D" | "L"; score: string }) {
  const config = {
    W: {
      bg: "bg-[#00e677]",
      text: "text-[#0f2319]",
    },
    D: {
      bg: "bg-[#6b7280]",
      text: "text-white",
    },
    L: {
      bg: "bg-[#dc2626]",
      text: "text-white",
    },
  };

  const { bg, text } = config[result];

  return (
    <div className={`w-full py-1.5 rounded-md ${bg} ${text} text-xs font-bold text-center`}>
      {score}
    </div>
  );
}

function MatchCard({ match }: { 
  match: TeamForm["matches"][0]; 
}) {
  const matchDate = new Date(match.date);
  const formattedDate = format(matchDate, "M/d", { locale: ko });
  const homeAway = match.isHome ? "H" : "A";
  const score = match.isHome 
    ? `${match.homeScore}-${match.awayScore}`
    : `${match.awayScore}-${match.homeScore}`;

  return (
    <Link
      href={`/matches/${match.id}`}
      className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-white/5 transition-colors min-w-[60px]"
    >
      <span className="text-[10px] text-[#8eccae] font-medium uppercase">
        {formattedDate}
      </span>
      
      <div className="size-10 rounded-full bg-[#214a36] flex items-center justify-center border border-[#2f6a4d] overflow-hidden">
        {match.opponentEmblemUrl ? (
          <img
            src={match.opponentEmblemUrl}
            alt={match.opponentName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs font-bold text-[#8eccae]">
            {match.opponentName.substring(0, 2)}
          </span>
        )}
      </div>
      
      <div className="text-center">
        <p className="text-white text-[10px] font-semibold truncate max-w-[56px]">
          {match.opponentName.length > 4 
            ? match.opponentName.substring(0, 4) 
            : match.opponentName}
        </p>
        <p className="text-[#8eccae] text-[9px]">({homeAway})</p>
      </div>
      
      <ResultPill result={match.result} score={score} />
    </Link>
  );
}

function TeamFormCard({ form, label }: { form: TeamForm; label: "HOME" | "AWAY" }) {
  const isHome = label === "HOME";
  const displayLabel = isHome ? "홈" : "원정";

  return (
    <div className="flex-1">
      <div className={`flex items-center gap-3 mb-4 ${isHome ? "" : "flex-row-reverse"}`}>
        <div className="size-8 rounded-full bg-[#214a36] flex items-center justify-center border border-[#2f6a4d] overflow-hidden">
          {form.teamEmblemUrl ? (
            <img
              src={form.teamEmblemUrl}
              alt={form.teamName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs font-bold text-[#8eccae]">
              {form.teamName.charAt(0)}
            </span>
          )}
        </div>
        <div className={isHome ? "" : "text-right"}>
          <p className="text-white font-bold text-sm">{form.teamName}</p>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-[#8eccae]">{displayLabel}</span>
            {form.recentForm.length > 0 && (
              <>
                <span className="text-[#2f6a4d]">•</span>
                <span className="text-[#00e677]">{form.stats.wins}승</span>
                <span className="text-[#6b7280]">{form.stats.draws}무</span>
                <span className="text-red-400">{form.stats.losses}패</span>
              </>
            )}
          </div>
        </div>
      </div>

      {form.matches.length > 0 ? (
        <div className={`flex gap-1 ${isHome ? "" : "flex-row-reverse"}`}>
          {form.matches.slice(0, 5).map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[140px]">
          <p className="text-[#8eccae] text-sm">최근 경기 기록이 없습니다.</p>
        </div>
      )}
    </div>
  );
}

export function TeamFormSection({ homeTeamForm, awayTeamForm, isGuestOpponent = false }: TeamFormSectionProps) {
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

      <div className="p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            {homeTeamForm ? (
              <TeamFormCard form={homeTeamForm} label="HOME" />
            ) : (
              <div className="text-center py-8">
                <p className="text-[#8eccae] text-sm">경기 기록 없음</p>
              </div>
            )}
          </div>

          <div className="w-px bg-[#214a36] self-stretch" />

          <div className="flex-1">
            {awayTeamForm ? (
              <TeamFormCard form={awayTeamForm} label="AWAY" />
            ) : (
              <div className="text-center py-8">
                <p className="text-[#8eccae] text-sm">
                  {isGuestOpponent
                    ? "게스트팀 전적 미제공"
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
