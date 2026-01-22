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
    W: { bg: "bg-[#00e677]", text: "text-[#0a1f13]" },
    D: { bg: "bg-[#4a5568]", text: "text-white" },
    L: { bg: "bg-[#e53e3e]", text: "text-white" },
  };

  const { bg, text } = config[result];

  return (
    <div className={`px-2 py-1 rounded-full ${bg} ${text} text-[10px] font-bold whitespace-nowrap`}>
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
    ? `${match.homeScore} - ${match.awayScore}`
    : `${match.awayScore} - ${match.homeScore}`;

  return (
    <Link
      href={`/matches/${match.id}`}
      className="flex flex-col items-center gap-1.5 py-2 px-1 rounded-lg hover:bg-white/5 transition-colors flex-1 min-w-0"
    >
      <span className="text-[9px] text-[#8eccae]/60 font-medium">
        {formattedDate}
      </span>
      
      <div className="size-9 rounded-full bg-[#162e23] flex items-center justify-center overflow-hidden">
        {match.opponentEmblemUrl ? (
          <img
            src={match.opponentEmblemUrl}
            alt={match.opponentName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-[10px] font-bold text-[#8eccae]">
            {match.opponentName.substring(0, 2)}
          </span>
        )}
      </div>
      
      <p className="text-[10px] text-white/80 font-medium">
        {match.opponentName.length > 3 
          ? match.opponentName.substring(0, 3)
          : match.opponentName}
        <span className="text-[#8eccae]/60 ml-0.5">({homeAway})</span>
      </p>
      
      <ResultPill result={match.result} score={score} />
    </Link>
  );
}

function TeamFormCard({ form, label }: { form: TeamForm; label: "HOME" | "AWAY" }) {
  const isHome = label === "HOME";

  return (
    <div className="flex-1">
      <div className={`flex items-center gap-2.5 mb-3 ${isHome ? "" : "flex-row-reverse"}`}>
        <div className="size-7 rounded-full bg-[#162e23] flex items-center justify-center overflow-hidden">
          {form.teamEmblemUrl ? (
            <img
              src={form.teamEmblemUrl}
              alt={form.teamName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-[10px] font-bold text-[#8eccae]">
              {form.teamName.charAt(0)}
            </span>
          )}
        </div>
        <p className="text-white font-semibold text-sm truncate">{form.teamName}</p>
      </div>

      {form.matches.length > 0 ? (
        <div className={`flex ${isHome ? "" : "flex-row-reverse"}`}>
          {form.matches.slice(0, 5).map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[120px]">
          <p className="text-[#8eccae]/70 text-xs">최근 경기 기록이 없습니다</p>
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
      <div className="px-5 py-3 border-b border-[#214a36]/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#00e677]" />
          <h3 className="text-white text-sm font-bold">Team Form</h3>
        </div>
        <span className="text-[10px] text-[#8eccae]/60">최근 5경기</span>
      </div>

      <div className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-3">
          <div className="flex-1 min-w-0">
            {homeTeamForm ? (
              <TeamFormCard form={homeTeamForm} label="HOME" />
            ) : (
              <div className="text-center py-6 sm:py-8">
                <p className="text-[#8eccae]/60 text-xs">경기 기록 없음</p>
              </div>
            )}
          </div>

          <div className="hidden sm:block w-px bg-[#214a36]/50 self-stretch" />
          <div className="sm:hidden h-px bg-[#214a36]/50 w-full" />

          <div className="flex-1 min-w-0">
            {awayTeamForm ? (
              <TeamFormCard form={awayTeamForm} label="AWAY" />
            ) : (
              <div className="text-center py-6 sm:py-8">
                <p className="text-[#8eccae]/60 text-xs">
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
