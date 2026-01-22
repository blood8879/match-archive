import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getMatchById,
  getMatchRecords,
  getMatchGoals,
  getMatchAttendance,
  getHeadToHeadStats,
  getTeamForm,
} from "@/services/matches";
import { getWeather } from "@/services/weather";
import { getOpponentPlayers } from "@/services/opponent-players";
import { getTeamById, getTeamMembers } from "@/services/teams";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Calendar, Users, Target, Edit, MapPin, Star } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { AttendanceButton } from "./attendance-button";
import { AttendanceManager } from "./attendance-manager";
import { GoalList } from "./goal-list";
import { OpponentLineup } from "./opponent-lineup";
import { DeleteMatchButton } from "./delete-match-button";
import { PreviousMeetings } from "./previous-meetings";
import { TeamFormSection } from "./team-form";
import { MatchWeather } from "./match-weather";

interface MatchDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchDetailPage({
  params,
}: MatchDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let match;
  let records;
  let goals;
  let attendance;
  let opponentPlayers: any[] = [];

  try {
    match = await getMatchById(id);
    if (!match) notFound();
    records = await getMatchRecords(id);
    goals = await getMatchGoals(id);
    attendance = await getMatchAttendance(id);

    // opponent_players 테이블이 없을 수 있으므로 에러 무시
    try {
      opponentPlayers = await getOpponentPlayers(id);
    } catch (error) {
      console.log("opponent_players not available yet:", error);
      opponentPlayers = [];
    }
  } catch (error) {
    console.error("Error loading match:", error);
    notFound();
  }

  const team = await getTeamById(match.team_id);
  const teamMembers = await getTeamMembers(match.team_id);

  // 상대전적 통계 가져오기
  const headToHeadStats = await getHeadToHeadStats(
    match.team_id,
    match.opponent_name,
    match.opponent_team_id,
    match.id
  );

  // Team Form 가져오기 (항상 표시)
  const homeTeamForm = await getTeamForm(match.team_id, match.id);
  const awayTeamForm = match.opponent_team_id
    ? await getTeamForm(match.opponent_team_id, match.id)
    : null;

  const currentUserMembership = teamMembers.find((m) => m.user_id === user?.id);
  const isManager =
    currentUserMembership?.role === "OWNER" ||
    currentUserMembership?.role === "MANAGER";

  const currentUserAttendance = attendance.find(
    (a) => a.team_member_id === currentUserMembership?.id
  );

  const isFinished = match.status === "FINISHED";
  const selectedMemberIds = records.map((r) => r.team_member_id);

  // 라인업에 있는 선수 ID 목록 (match_records 기반)
  const lineupMemberIds = records.map((r) => r.team_member_id);

  // opponent_team이 있으면 현재 팀명 사용, 없으면 저장된 opponent_name 사용
  const opponentDisplayName = (match as any).opponent_team?.name || match.opponent_name;

  // 경기장 정보
  const venue = (match as any).venue;
  const venueAddress = venue
    ? venue.address_detail
      ? `${venue.address} ${venue.address_detail}`
      : venue.address
    : match.location;

  // 날씨 정보 (경기장 좌표가 있는 경우만)
  let weather = null;
  if (venue?.latitude && venue?.longitude) {
    const matchTime = match.match_date.split("T")[1]?.substring(0, 5);
    weather = await getWeather(
      venue.latitude,
      venue.longitude,
      match.match_date.split("T")[0],
      matchTime
    );
  }

  return (
    <div className="min-h-screen bg-[#0f2319] relative">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#00e677]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#214a36]/20 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-3xl px-3 sm:px-4 py-4 sm:py-6 lg:px-8 lg:py-8 space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:gap-3">
          <Link
            href="/matches"
            className="flex items-center gap-1.5 sm:gap-2 text-[#8eccae] hover:text-[#00e677] transition-colors text-xs sm:text-sm w-fit"
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>경기 목록으로</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                라인업 및 경기 관리
              </h1>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[#8eccae] text-xs sm:text-sm mt-1">
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                <p className="font-medium truncate">
                  {formatDateTime(match.match_date)} vs {opponentDisplayName}
                </p>
              </div>
              {(venue?.name || venueAddress) && (
                <div className="flex items-center gap-1.5 sm:gap-2 text-[#8eccae] text-xs sm:text-sm mt-1">
                  <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                  <p className="font-medium truncate">
                    {venue?.name && <span className="text-white">{venue.name}</span>}
                    {venue?.name && venueAddress && <span className="mx-1">·</span>}
                    {venueAddress && <span>{venueAddress}</span>}
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {weather && <MatchWeather weather={weather} />}
              {isManager && (
                <div className="flex items-center gap-2">
                <Link
                  href={`/matches/${match.id}/edit`}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-[#214a36] hover:bg-[#2b5d45] text-white text-xs sm:text-sm font-medium transition-colors"
                >
                  <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">경기 수정</span>
                  <span className="xs:hidden">수정</span>
                </Link>
                <DeleteMatchButton matchId={match.id} teamId={match.team_id} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Score Board */}
        <section className="glass-panel rounded-xl sm:rounded-2xl p-4 sm:p-6 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-full bg-gradient-to-b from-[#00e677]/5 to-transparent pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            {/* Home Team */}
            <div className="flex flex-col items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
              <div className="size-12 sm:size-16 rounded-full bg-[#00e677]/10 border-2 border-[#00e677]/30 flex items-center justify-center overflow-hidden">
                {team?.emblem_url ? (
                  <img
                    src={team.emblem_url}
                    alt={team.name || "Home Team"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg sm:text-2xl font-bold text-[#00e677]">
                    {team?.name?.charAt(0) || "N"}
                  </span>
                )}
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none">
                  {team?.name || "NYC FC"}
                </p>
                <p className="text-[#8eccae] text-[10px] sm:text-xs mt-0.5">HOME</p>
              </div>
            </div>

            {/* Score */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              <div className="w-12 h-16 sm:w-16 sm:h-20 flex items-center justify-center rounded-lg sm:rounded-xl bg-[#162e23] border border-[#214a36]">
                <span className="text-3xl sm:text-5xl font-black text-white">
                  {match.home_score}
                </span>
              </div>
              <span className="text-xl sm:text-2xl text-[#8eccae]/50 font-thin">:</span>
              <div className="w-12 h-16 sm:w-16 sm:h-20 flex items-center justify-center rounded-lg sm:rounded-xl bg-[#162e23] border border-[#214a36]">
                <span className="text-3xl sm:text-5xl font-black text-white">
                  {match.away_score}
                </span>
              </div>
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
              <div className="size-12 sm:size-16 rounded-full bg-[#214a36] border-2 border-[#2f6a4d] flex items-center justify-center overflow-hidden">
                {(match as any).opponent_team?.emblem_url ? (
                  <img
                    src={(match as any).opponent_team.emblem_url}
                    alt={opponentDisplayName || "Away Team"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg sm:text-2xl font-bold text-[#8eccae]">
                    {opponentDisplayName?.charAt(0) || "Z"}
                  </span>
                )}
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none">
                  {opponentDisplayName}
                </p>
                <p className="text-[#8eccae] text-[10px] sm:text-xs mt-0.5">AWAY</p>
              </div>
            </div>
          </div>

          {!isFinished && (
            <p className="text-center text-[#00e677] text-[10px] sm:text-xs font-medium mt-3 sm:mt-4">
              LIVE SCORE
            </p>
          )}
        </section>

        {/* Attendance Buttons - 일반 사용자용 */}
        {!isFinished && currentUserMembership && (
          <section>
            <AttendanceButton
              matchId={match.id}
              currentStatus={currentUserAttendance?.status ?? null}
              isFinished={isFinished}
            />
          </section>
        )}

        {/* Attendance Manager - 운영진용 */}
        {isManager && (
          <AttendanceManager
            matchId={match.id}
            teamMembers={teamMembers}
            attendance={attendance}
            isFinished={isFinished}
          />
        )}

        {/* 결과 입력/수정 버튼 - 운영진만 표시 */}
        {isManager && !isFinished && (
          <Link
            href={`/matches/${match.id}/result`}
            className="flex items-center justify-center gap-2 w-full h-10 sm:h-12 rounded-xl bg-[#00e677] hover:bg-green-400 text-[#0f2319] font-bold text-sm sm:text-base transition-colors"
          >
            <Target className="h-4 w-4 sm:h-5 sm:w-5" />
            경기 결과 입력
          </Link>
        )}
        {isManager && isFinished && (
          <Link
            href={`/matches/${match.id}/result`}
            className="flex items-center justify-center gap-2 w-full h-10 sm:h-12 rounded-xl bg-[#214a36] hover:bg-[#2b5d45] text-white font-bold text-sm sm:text-base transition-colors border border-[#2f6a4d]"
          >
            <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
            경기 결과 수정
          </Link>
        )}

        {/* Combined Lineup Section - 2 Column Layout */}
        <section className="glass-panel rounded-xl sm:rounded-2xl overflow-hidden">
          <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-[#214a36] bg-[#162e23]/50 flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="p-1 bg-[#00e677]/20 rounded-md">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#00e677]" />
              </div>
              <h3 className="text-white text-xs sm:text-sm font-bold">라인업</h3>
            </div>
          </div>
          <div className="p-3 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Home Team Lineup */}
              <div>
                <h4 className="text-white text-xs sm:text-sm font-bold mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-[#00e677]/20 text-[#00e677] text-[10px] sm:text-xs">HOME</span>
                  <span className="truncate">{team?.name || "NYC FC"} ({selectedMemberIds.length}명)</span>
                </h4>
                <ul className="space-y-1.5 sm:space-y-2">
                  {records.map((record) => {
                    const member = teamMembers.find(
                      (m) => m.id === record.team_member_id
                    );
                    const displayName =
                      member?.is_guest && member?.guest_name
                        ? member.guest_name
                        : member?.user?.nickname || "알 수 없음";
                    const position = member?.user?.position;
                    return (
                      <li
                        key={record.id}
                        className="flex items-center justify-between rounded-lg bg-[#162e23] hover:bg-[#1e3a2c] px-3 sm:px-4 py-2 sm:py-3 transition-colors"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          {member?.user?.avatar_url ? (
                            <img
                              src={member.user.avatar_url}
                              alt={displayName}
                              className="size-6 sm:size-8 rounded-full object-cover border-2 border-[#214a36] shrink-0"
                            />
                          ) : (
                            <div className="size-6 sm:size-8 rounded-full bg-[#214a36] flex items-center justify-center text-[#8eccae] text-[10px] sm:text-xs font-bold shrink-0">
                              {displayName.charAt(0)}
                            </div>
                          )}
                          <span className="text-white font-medium text-xs sm:text-sm truncate">
                            {displayName}
                          </span>
                          {position && (
                            <span
                              className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold shrink-0 hidden xs:inline ${
                                position === "FW"
                                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                  : position === "MF"
                                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                  : position === "DF"
                                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                  : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                              }`}
                            >
                              {position}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          {record.is_mom && (
                            <span className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] sm:text-xs font-bold border border-amber-500/30">
                              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-400" />
                              <span className="hidden xs:inline">MOM</span>
                            </span>
                          )}
                          <span className="text-[10px] sm:text-sm text-[#8eccae]">
                            {record.goals > 0 && `${record.goals}골`}
                            {record.goals > 0 && record.assists > 0 && " "}
                            {record.assists > 0 && `${record.assists}도움`}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                  {records.length === 0 && (
                    <p className="py-6 sm:py-8 text-center text-[#8eccae] text-xs sm:text-sm">
                      참석한 플레이어가 없습니다
                    </p>
                  )}
                </ul>
              </div>

              {/* Away Team Lineup */}
              <div>
                <h4 className="text-white text-xs sm:text-sm font-bold mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-[#214a36] text-[#8eccae] text-[10px] sm:text-xs">AWAY</span>
                  <span className="truncate">{opponentDisplayName} ({opponentPlayers.filter((p) => p.is_playing).length}명)</span>
                </h4>
                <OpponentLineup
                  matchId={match.id}
                  opponentPlayers={opponentPlayers}
                  isManager={isManager}
                  isFinished={isFinished}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Goal Records */}
        <section className="glass-panel rounded-xl sm:rounded-2xl overflow-hidden">
          <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-[#214a36] bg-[#162e23]/50 flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="p-1 bg-[#00e677]/20 rounded-md">
                <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#00e677]" />
              </div>
              <h3 className="text-white text-xs sm:text-sm font-bold">
                득점 기록 ({goals.length}골)
              </h3>
            </div>
          </div>
          <div className="p-3 sm:p-5">
            <GoalList
              goals={goals}
              teamMembers={teamMembers}
              opponentPlayers={opponentPlayers}
              matchId={match.id}
              isManager={isManager}
              isFinished={isFinished}
              attendingMemberIds={lineupMemberIds}
              readOnly={true}
            />
          </div>
        </section>

        {/* Team Form - 양팀의 최근 경기 폼 */}
        <TeamFormSection
          homeTeamForm={homeTeamForm}
          awayTeamForm={awayTeamForm}
          isGuestOpponent={match.is_guest_opponent}
        />

        {/* Previous Meetings - 상대전적 통계 */}
        <PreviousMeetings
          stats={headToHeadStats}
          teamName={team?.name || "우리팀"}
          opponentName={opponentDisplayName}
          teamEmblemUrl={team?.emblem_url}
          opponentEmblemUrl={(match as any).opponent_team?.emblem_url}
        />
      </div>
    </div>
  );
}
