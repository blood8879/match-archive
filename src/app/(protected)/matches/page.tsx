import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Calendar, MapPin, Trophy, Clock, ChevronRight, Plus } from "lucide-react";
import { formatDateTime, getMatchResultLabel, getResultColor } from "@/lib/utils";
import type { Match, Team, TeamMember } from "@/types/supabase";

type MatchWithTeam = Match & {
  team: Team | null;
  opponent_team: { id: string; name: string; emblem_url: string | null } | null;
};
type TeamMemberWithTeam = TeamMember & { team: Team | null };

export default async function MatchesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: myTeamsRaw } = await supabase
    .from("team_members")
    .select("*, team:teams(*)")
    .eq("user_id", user.id)
    .eq("status", "active");

  const myTeams = myTeamsRaw as TeamMemberWithTeam[] | null;
  const teamIds = myTeams?.map((t) => t.team_id) ?? [];
  const firstTeam = myTeams?.[0]?.team;

  let matches: MatchWithTeam[] = [];

  if (teamIds.length > 0) {
    const { data: matchesRaw } = await supabase
      .from("matches")
      .select("*, team:teams!matches_team_id_fkey(*), opponent_team:teams!matches_opponent_team_id_fkey(id, name, emblem_url)")
      .in("team_id", teamIds)
      .order("match_date", { ascending: false });

    matches = (matchesRaw as MatchWithTeam[]) ?? [];
  }

  const scheduledMatches = matches.filter((m) => m.status === "SCHEDULED");
  const finishedMatches = matches.filter((m) => m.status === "FINISHED");

  return (
    <div className="relative min-h-screen">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#00e677]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#214a36]/20 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#00e677] text-sm font-bold tracking-wider uppercase">Match History</span>
              <div className="h-px w-8 bg-[#00e677]/30"></div>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">경기 일정</h1>
            <p className="text-gray-400 mt-2">내 팀의 경기 기록을 확인하세요</p>
          </div>
          {firstTeam && (
            <Link
              href={`/teams/${firstTeam.id}/matches/new`}
              className="flex items-center gap-2 h-11 px-6 bg-[#00e677] hover:bg-green-400 text-[#0f2319] font-bold rounded-xl transition-all shadow-lg shadow-[#00e677]/20"
            >
              <Plus className="w-5 h-5" />
              경기 생성
            </Link>
          )}
        </div>

        {scheduledMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#00e677]/10 rounded-lg">
                <Clock className="w-5 h-5 text-[#00e677]" />
              </div>
              <h2 className="text-xl font-bold text-white">예정된 경기</h2>
              <span className="text-sm text-[#00e677] font-medium">{scheduledMatches.length}</span>
            </div>
            <div className="space-y-3">
              {scheduledMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        )}

        {finishedMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#8eccae]/10 rounded-lg">
                <Trophy className="w-5 h-5 text-[#8eccae]" />
              </div>
              <h2 className="text-xl font-bold text-white">완료된 경기</h2>
              <span className="text-sm text-[#8eccae] font-medium">{finishedMatches.length}</span>
            </div>
            <div className="space-y-3">
              {finishedMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        )}

        {matches.length === 0 && (
          <div className="bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15 rounded-2xl p-12 text-center">
            <div className="size-16 mx-auto mb-4 rounded-full bg-[#00e677]/10 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-[#00e677]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">등록된 경기가 없습니다</h3>
            <p className="text-gray-400 mb-6">팀에서 첫 경기를 생성해보세요</p>
            {firstTeam && (
              <Link
                href={`/teams/${firstTeam.id}/matches/new`}
                className="inline-flex items-center gap-2 h-11 px-6 bg-[#00e677] hover:bg-green-400 text-[#0f2319] font-bold rounded-xl transition-all"
              >
                <Plus className="w-5 h-5" />
                첫 경기 생성하기
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: MatchWithTeam }) {
  const isFinished = match.status === "FINISHED";
  const result = isFinished ? getMatchResultLabel(match.home_score, match.away_score) : null;

  const getResultText = (r: "W" | "D" | "L") => {
    if (r === "W") return "승리";
    if (r === "L") return "패배";
    return "무승부";
  };

  return (
    <Link href={`/matches/${match.id}`}>
      <div className="bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15 rounded-xl p-4 md:p-5 hover:bg-[#214a36]/60 hover:border-[#00e677]/30 transition-all group cursor-pointer">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm text-[#8eccae] mb-2">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>{formatDateTime(match.match_date)}</span>
              {!isFinished && (
                <span className="px-2 py-0.5 rounded-md bg-[#00e677]/10 text-[#00e677] text-xs font-bold">
                  예정
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3 md:gap-4">
              <div className="flex items-center gap-2">
                <div className="size-10 md:size-12 rounded-full bg-[#1a4031] flex items-center justify-center border border-[#2f6a4d]">
                  <span className="text-lg md:text-xl font-bold text-[#00e677]">
                    {match.team?.name?.charAt(0) || "H"}
                  </span>
                </div>
                <span className="font-bold text-white text-sm md:text-base truncate max-w-[80px] md:max-w-[120px]">
                  {match.team?.name}
                </span>
              </div>

              {isFinished ? (
                <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">
                  <span className="text-xl md:text-2xl font-black text-white tabular-nums">{match.home_score}</span>
                  <span className="text-gray-500">-</span>
                  <span className="text-xl md:text-2xl font-black text-white tabular-nums">{match.away_score}</span>
                </div>
              ) : (
                <span className="text-gray-500 font-medium px-3">vs</span>
              )}

              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm md:text-base truncate max-w-[80px] md:max-w-[120px]">
                  {match.opponent_name}
                </span>
                <div className="size-10 md:size-12 rounded-full bg-[#214a36] flex items-center justify-center border border-[#2f6a4d] overflow-hidden">
                  {match.opponent_team?.emblem_url ? (
                    <img
                      src={match.opponent_team.emblem_url}
                      alt={match.opponent_name || "상대팀"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg md:text-xl font-bold text-[#8eccae]">
                      {match.opponent_name?.charAt(0) || "A"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {match.location && (
              <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-400">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{match.location}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {result && (
              <div
                className="flex flex-col items-center justify-center h-14 w-14 md:h-16 md:w-16 rounded-xl text-center"
                style={{
                  backgroundColor: `color-mix(in srgb, ${getResultColor(result)} 15%, transparent)`,
                  borderColor: `color-mix(in srgb, ${getResultColor(result)} 30%, transparent)`,
                  borderWidth: "1px",
                }}
              >
                <span className="text-xl md:text-2xl font-black" style={{ color: getResultColor(result) }}>
                  {result}
                </span>
                <span className="text-[10px] font-medium" style={{ color: getResultColor(result) }}>
                  {getResultText(result)}
                </span>
              </div>
            )}
            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-[#00e677] transition-colors flex-shrink-0" />
          </div>
        </div>
      </div>
    </Link>
  );
}
