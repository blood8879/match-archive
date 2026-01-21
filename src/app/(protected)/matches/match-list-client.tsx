"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Trophy,
  Clock,
  ChevronRight,
  Plus,
  Filter,
  ChevronDown,
} from "lucide-react";
import { formatDateTime, getMatchResultLabel, getResultColor } from "@/lib/utils";
import type { Match, Team } from "@/types/supabase";

type MatchWithTeam = Match & {
  team: Team | null;
  opponent_team: { id: string; name: string; emblem_url: string | null } | null;
  venue: { id: string; name: string; address: string } | null;
};

type TeamInfo = {
  id: string;
  name: string;
  emblem_url: string | null;
};

interface MatchListClientProps {
  matches: MatchWithTeam[];
  teams: TeamInfo[];
}

export function MatchListClient({ matches, teams }: MatchListClientProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>("ALL");
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);

  const filteredMatches =
    selectedTeamId === "ALL"
      ? matches
      : matches.filter((m) => m.team_id === selectedTeamId);

  // 예정된 경기: 오름차순 (가장 가까운 경기가 위로)
  const scheduledMatches = filteredMatches
    .filter((m) => m.status === "SCHEDULED")
    .sort(
      (a, b) =>
        new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    );

  // 완료된 경기: 내림차순 (최근 경기가 위로)
  const finishedMatches = filteredMatches.filter((m) => m.status === "FINISHED");

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  return (
    <div className="relative min-h-screen">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#00e677]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#214a36]/20 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#00e677] text-xs sm:text-sm font-bold tracking-wider uppercase">
                Match History
              </span>
              <div className="h-px w-6 sm:w-8 bg-[#00e677]/30"></div>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              경기 일정
            </h1>
            <p className="text-gray-400 text-sm sm:text-base mt-1 sm:mt-2">내 팀의 경기 기록을 확인하세요</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* 팀 필터 드롭다운 */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowTeamDropdown(!showTeamDropdown);
                  setShowCreateDropdown(false);
                }}
                className="flex items-center gap-1.5 sm:gap-2 h-9 sm:h-11 px-3 sm:px-4 bg-[#214a36] hover:bg-[#2b5d45] text-white font-medium text-sm sm:text-base rounded-xl transition-all border border-[#2f6a4d]"
              >
                <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8eccae]" />
                <span className="max-w-[80px] sm:max-w-[120px] truncate">
                  {selectedTeamId === "ALL" ? "전체 팀" : selectedTeam?.name}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8eccae] transition-transform ${
                    showTeamDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showTeamDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowTeamDropdown(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-[#1a3a2a] border border-[#2f6a4d] shadow-xl z-20 py-2 max-h-64 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedTeamId("ALL");
                        setShowTeamDropdown(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-3 ${
                        selectedTeamId === "ALL"
                          ? "bg-[#00e677]/10 text-[#00e677]"
                          : "text-white hover:bg-[#214a36]"
                      }`}
                    >
                      <div className="size-8 rounded-full bg-[#214a36] flex items-center justify-center border border-[#2f6a4d]">
                        <span className="text-sm font-bold text-[#8eccae]">A</span>
                      </div>
                      <span className="font-medium">전체 팀</span>
                      {selectedTeamId === "ALL" && (
                        <span className="ml-auto text-[#00e677]">✓</span>
                      )}
                    </button>
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => {
                          setSelectedTeamId(team.id);
                          setShowTeamDropdown(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-3 ${
                          selectedTeamId === team.id
                            ? "bg-[#00e677]/10 text-[#00e677]"
                            : "text-white hover:bg-[#214a36]"
                        }`}
                      >
                        <div className="size-8 rounded-full bg-[#214a36] flex items-center justify-center border border-[#2f6a4d] overflow-hidden">
                          {team.emblem_url ? (
                            <img
                              src={team.emblem_url}
                              alt={team.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-bold text-[#8eccae]">
                              {team.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className="font-medium truncate">{team.name}</span>
                        {selectedTeamId === team.id && (
                          <span className="ml-auto text-[#00e677]">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 경기 생성 드롭다운 */}
            {teams.length > 0 && (
              <div className="relative">
                {teams.length === 1 ? (
                  <Link
                    href={`/teams/${teams[0].id}/matches/new`}
                    className="flex items-center gap-1.5 sm:gap-2 h-9 sm:h-11 px-4 sm:px-6 bg-[#00e677] hover:bg-green-400 text-[#0f2319] font-bold text-sm sm:text-base rounded-xl transition-all shadow-lg shadow-[#00e677]/20"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden xs:inline">경기 생성</span>
                    <span className="xs:hidden">생성</span>
                  </Link>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setShowCreateDropdown(!showCreateDropdown);
                        setShowTeamDropdown(false);
                      }}
                      className="flex items-center gap-1.5 sm:gap-2 h-9 sm:h-11 px-4 sm:px-6 bg-[#00e677] hover:bg-green-400 text-[#0f2319] font-bold text-sm sm:text-base rounded-xl transition-all shadow-lg shadow-[#00e677]/20"
                    >
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden xs:inline">경기 생성</span>
                      <span className="xs:hidden">생성</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${
                          showCreateDropdown ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {showCreateDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowCreateDropdown(false)}
                        />
                        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-[#1a3a2a] border border-[#2f6a4d] shadow-xl z-20 py-2 max-h-64 overflow-y-auto">
                          <p className="px-4 py-2 text-xs text-[#8eccae] font-medium border-b border-[#2f6a4d] mb-1">
                            어느 팀의 경기를 생성할까요?
                          </p>
                          {teams.map((team) => (
                            <Link
                              key={team.id}
                              href={`/teams/${team.id}/matches/new`}
                              onClick={() => setShowCreateDropdown(false)}
                              className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-[#214a36] transition-colors flex items-center gap-3"
                            >
                              <div className="size-8 rounded-full bg-[#214a36] flex items-center justify-center border border-[#2f6a4d] overflow-hidden">
                                {team.emblem_url ? (
                                  <img
                                    src={team.emblem_url}
                                    alt={team.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-sm font-bold text-[#8eccae]">
                                    {team.name.charAt(0)}
                                  </span>
                                )}
                              </div>
                              <span className="font-medium truncate">
                                {team.name}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {scheduledMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="p-1.5 sm:p-2 bg-[#00e677]/10 rounded-lg">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#00e677]" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">예정된 경기</h2>
              <span className="text-xs sm:text-sm text-[#00e677] font-medium">
                {scheduledMatches.length}
              </span>
            </div>
            <div className="space-y-3 sm:space-y-6">
              {scheduledMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        )}

        {finishedMatches.length > 0 && (
          <section>
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="p-1.5 sm:p-2 bg-[#8eccae]/10 rounded-lg">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-[#8eccae]" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">완료된 경기</h2>
              <span className="text-xs sm:text-sm text-[#8eccae] font-medium">
                {finishedMatches.length}
              </span>
            </div>
            <div className="space-y-3 sm:space-y-6">
              {finishedMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        )}

        {filteredMatches.length === 0 && (
          <div className="bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15 rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center">
            <div className="size-12 sm:size-16 mx-auto mb-3 sm:mb-4 rounded-full bg-[#00e677]/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-[#00e677]" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
              {selectedTeamId === "ALL"
                ? "등록된 경기가 없습니다"
                : "선택한 팀의 경기가 없습니다"}
            </h3>
            <p className="text-gray-400 text-sm sm:text-base mb-4 sm:mb-6">
              {selectedTeamId === "ALL"
                ? "팀에서 첫 경기를 생성해보세요"
                : "이 팀의 경기를 생성해보세요"}
            </p>
            {teams.length > 0 && (
              <Link
                href={`/teams/${
                  selectedTeamId === "ALL" ? teams[0].id : selectedTeamId
                }/matches/new`}
                className="inline-flex items-center gap-2 h-10 sm:h-11 px-5 sm:px-6 bg-[#00e677] hover:bg-green-400 text-[#0f2319] font-bold text-sm sm:text-base rounded-xl transition-all"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                경기 생성하기
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
  const result = isFinished
    ? getMatchResultLabel(match.home_score, match.away_score)
    : null;

  // opponent_team이 있으면 현재 팀명 사용, 없으면 저장된 opponent_name 사용
  const opponentDisplayName = match.opponent_team?.name || match.opponent_name;

  const getResultText = (r: "W" | "D" | "L") => {
    if (r === "W") return "승리";
    if (r === "L") return "패배";
    return "무승부";
  };

  return (
    <Link href={`/matches/${match.id}`} className="block">
      <div className="bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-7 hover:bg-[#214a36]/60 hover:border-[#00e677]/30 transition-all group cursor-pointer">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-[#8eccae] mb-2">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">{formatDateTime(match.match_date)}</span>
              {!isFinished && (
                <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-[#00e677]/10 text-[#00e677] text-[10px] sm:text-xs font-bold shrink-0">
                  예정
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="size-8 sm:size-10 md:size-12 rounded-full bg-[#1a4031] flex items-center justify-center border border-[#2f6a4d] overflow-hidden shrink-0">
                  {match.team?.emblem_url ? (
                    <img
                      src={match.team.emblem_url}
                      alt={match.team?.name || "홈팀"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm sm:text-lg md:text-xl font-bold text-[#00e677]">
                      {match.team?.name?.charAt(0) || "H"}
                    </span>
                  )}
                </div>
                <span className="font-bold text-white text-xs sm:text-sm md:text-base truncate max-w-[60px] sm:max-w-[80px] md:max-w-[120px]">
                  {match.team?.name}
                </span>
              </div>

              {isFinished ? (
                <div className="flex items-center gap-1 sm:gap-2 bg-black/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-white/5 shrink-0">
                  <span className="text-base sm:text-xl md:text-2xl font-black text-white tabular-nums">
                    {match.home_score}
                  </span>
                  <span className="text-gray-500 text-sm sm:text-base">-</span>
                  <span className="text-base sm:text-xl md:text-2xl font-black text-white tabular-nums">
                    {match.away_score}
                  </span>
                </div>
              ) : (
                <span className="text-gray-500 font-medium px-1.5 sm:px-3 text-sm shrink-0">vs</span>
              )}

              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="font-bold text-white text-xs sm:text-sm md:text-base truncate max-w-[60px] sm:max-w-[80px] md:max-w-[120px]">
                  {opponentDisplayName}
                </span>
                <div className="size-8 sm:size-10 md:size-12 rounded-full bg-[#214a36] flex items-center justify-center border border-[#2f6a4d] overflow-hidden shrink-0">
                  {match.opponent_team?.emblem_url ? (
                    <img
                      src={match.opponent_team.emblem_url}
                      alt={opponentDisplayName || "상대팀"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm sm:text-lg md:text-xl font-bold text-[#8eccae]">
                      {opponentDisplayName?.charAt(0) || "A"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {(match.venue || match.location) && (
              <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5 text-xs sm:text-sm text-gray-400">
                <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                <span className="truncate">
                  {match.venue?.name || match.location}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {result && (
              <div
                className="flex flex-col items-center justify-center h-11 w-11 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-lg sm:rounded-xl text-center"
                style={{
                  backgroundColor: `color-mix(in srgb, ${getResultColor(
                    result
                  )} 15%, transparent)`,
                  borderColor: `color-mix(in srgb, ${getResultColor(
                    result
                  )} 30%, transparent)`,
                  borderWidth: "1px",
                }}
              >
                <span
                  className="text-base sm:text-xl md:text-2xl font-black"
                  style={{ color: getResultColor(result) }}
                >
                  {result}
                </span>
                <span
                  className="text-[8px] sm:text-[10px] font-medium"
                  style={{ color: getResultColor(result) }}
                >
                  {getResultText(result)}
                </span>
              </div>
            )}
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-[#00e677] transition-colors flex-shrink-0" />
          </div>
        </div>
      </div>
    </Link>
  );
}
