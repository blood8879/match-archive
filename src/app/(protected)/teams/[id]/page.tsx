import { notFound } from "next/navigation";
import { getTeamById, getTeamMembers } from "@/services/teams";
import {
  getTeamStatistics,
  getRecentMatches,
  getNextMatch,
} from "@/services/team-stats";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { MapPin, Calendar, Copy, Zap, Users, UserPlus, Star, ArrowLeft, Settings } from "lucide-react";
import { MemberList } from "./member-list";
import { JoinTeamButton } from "./join-team-button";
import { formatDateTime } from "@/lib/utils";

interface TeamDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let team;
  let members;
  let stats;
  let recentMatches;
  let nextMatch;

  try {
    team = await getTeamById(id);
    members = await getTeamMembers(id);
    stats = await getTeamStatistics(id);
    recentMatches = await getRecentMatches(id, 5);
    nextMatch = await getNextMatch(id);
  } catch {
    notFound();
  }

  if (!team) {
    notFound();
  }

  // active 상태의 멤버십을 우선 찾고, 없으면 다른 상태의 멤버십 반환
  // (용병 기록 병합 등으로 duplicate 레코드가 생긴 경우 대비)
  const currentUserMembership = 
    members.find((m) => m.user_id === user?.id && m.status === "active") ||
    members.find((m) => m.user_id === user?.id);
  const isManager =
    currentUserMembership?.role === "OWNER" ||
    currentUserMembership?.role === "MANAGER";
  const isPending = currentUserMembership?.status === "pending";

  const activeMembers = members.filter(
    (m) => m.status === "active" && !m.is_guest
  );
  const activeUserIds = new Set(activeMembers.map((m) => m.user_id));
  const pendingMembers = members.filter(
    (m) => m.status === "pending" && !activeUserIds.has(m.user_id)
  );


  return (
    <main className="relative z-10 flex-1 max-w-[1280px] mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8 flex flex-col gap-4 md:gap-6">
      {/* Back Button */}
      <Link
        href="/teams"
        className="flex items-center gap-2 text-[#8eccae] hover:text-[#00e677] transition-colors text-sm w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>팀 목록으로</span>
      </Link>

      <section className="glass-card rounded-xl md:rounded-2xl p-4 md:p-8 flex flex-col md:flex-row gap-4 md:gap-8 items-start md:items-center justify-between shadow-lg">
        <div className="flex flex-row md:flex-row gap-4 md:gap-6 items-center w-full md:w-auto">
          <div className="relative group shrink-0">
            <div className="size-20 md:size-36 rounded-full bg-gradient-to-br from-[#214a36] to-[#0f2319] p-1 shadow-2xl ring-2 ring-white/10">
              {team.emblem_url ? (
                <img
                  src={team.emblem_url}
                  alt={team.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[#1a4031] flex items-center justify-center">
                  <Zap className="w-8 h-8 md:w-16 md:h-16 text-[#06e076]" />
                </div>
              )}
            </div>
            <div className="absolute bottom-0 right-0 bg-primary text-[#0f2319] text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full border-2 border-[#10231a]">
              LV. {team.level || 1}
            </div>
          </div>

          <div className="flex flex-col items-start text-left min-w-0 flex-1">
            <div className="flex items-center gap-2 md:gap-3 mb-1">
              <h2 className="text-xl md:text-4xl font-bold text-white tracking-tight truncate">{team.name}</h2>
              <span className="material-symbols-outlined text-primary text-base md:text-xl shrink-0" title="인증된 팀">verified</span>
            </div>
            <p className="text-[#8eccae] text-xs md:text-base mb-2 md:mb-4 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs md:text-sm">location_on</span>
              {team.region || "지역 미설정"}
            </p>
            {team.hashtags && team.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 md:gap-2 text-xs md:text-sm text-gray-300">
                {team.hashtags.slice(0, 3).map((tag, index) => (
                  <span key={index} className="px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg bg-white/5 border border-white/5">
                    {tag}
                  </span>
                ))}
                {team.hashtags.length > 3 && (
                  <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 text-gray-400">
                    +{team.hashtags.length - 3}
                  </span>
                )}
              </div>
            )}
            {isManager && (
              <div className="mt-2 md:mt-3 flex items-center gap-2">
                <span className="rounded bg-[#214a36] px-2 py-0.5 md:py-1 text-[10px] md:text-xs text-[#8eccae]">
                  초대코드: {team.code}
                </span>
                <button className="text-[#8eccae] hover:text-white" title="복사">
                  <Copy className="h-3 w-3 md:h-4 md:w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 md:gap-3 w-full md:w-auto">
          {!currentUserMembership && <JoinTeamButton teamId={team.id} />}
          {isPending && (
            <button disabled className="col-span-2 sm:col-span-1 h-10 md:h-12 px-4 md:px-8 rounded-xl bg-[#214a36] text-white/50 font-bold text-xs md:text-base border border-white/5 flex items-center justify-center gap-2 cursor-not-allowed">
              승인 대기 중
            </button>
          )}
          {isManager && (
            <Link
              href={`/teams/${team.id}/matches/new`}
              className="col-span-2 h-10 md:h-12 px-4 md:px-8 rounded-xl bg-primary hover:bg-primary/90 text-[#0f2319] font-bold text-xs md:text-base transition-all shadow-[0_0_20px_rgba(6,224,118,0.2)] flex items-center justify-center gap-1.5 md:gap-2"
            >
              <span className="material-symbols-outlined text-[16px] md:text-[20px]">event</span>
              경기 등록
            </Link>
          )}
          {isManager && (
            <>
              <Link
                href={`/teams/${team.id}/guest-teams`}
                className="h-10 md:h-12 px-3 md:px-6 rounded-xl bg-[#214a36] hover:bg-[#2b5d45] text-white font-semibold text-xs md:text-base transition-all border border-white/5 flex items-center justify-center gap-1.5 md:gap-2"
              >
                <Users className="h-4 w-4 md:h-5 md:w-5" />
                <span className="hidden sm:inline">게스트팀</span>
                <span className="sm:hidden">게스트</span>
              </Link>
              <Link
                href={`/teams/${team.id}/settings`}
                className="h-10 md:h-12 px-3 md:px-6 rounded-xl bg-[#214a36] hover:bg-[#2b5d45] text-white font-semibold text-xs md:text-base transition-all border border-white/5 flex items-center justify-center gap-1.5 md:gap-2"
              >
                <Settings className="h-4 w-4 md:h-5 md:w-5" />
                설정
              </Link>
            </>
          )}
          <button className="col-span-2 sm:col-span-1 h-10 md:h-12 px-3 md:px-6 rounded-xl bg-[#214a36] hover:bg-[#2b5d45] text-white font-semibold text-xs md:text-base transition-all border border-white/5 flex items-center justify-center gap-1.5 md:gap-2">
            <span className="material-symbols-outlined text-[16px] md:text-[20px]">chat</span>
            문의하기
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="glass-card p-3 md:p-5 rounded-xl flex flex-col justify-between h-24 md:h-32 relative overflow-hidden group">
          <div className="absolute right-[-10px] top-[-10px] bg-primary/20 w-16 md:w-24 h-16 md:h-24 rounded-full blur-2xl group-hover:bg-primary/30 transition-colors"></div>
          <div className="flex items-start justify-between">
            <p className="text-[#8eccae] text-xs md:text-sm font-medium">통산 승률</p>
            <span className="material-symbols-outlined text-primary text-base md:text-xl">trophy</span>
          </div>
          <div>
            <span className="text-xl md:text-3xl font-bold text-white">
              {stats.totalMatches > 0 ? `${stats.winRate}%` : "-"}
            </span>
            <p className="text-[10px] md:text-xs text-gray-400 mt-0.5 md:mt-1">
              {stats.totalMatches > 0
                ? `${stats.wins}승 ${stats.draws}무 ${stats.losses}패`
                : "경기 없음"}
            </p>
          </div>
        </div>

        <div className="glass-card p-3 md:p-5 rounded-xl flex flex-col justify-between h-24 md:h-32">
          <p className="text-[#8eccae] text-xs md:text-sm font-medium mb-1 md:mb-2">최근 5경기</p>
          <div className="flex items-center gap-1 md:gap-2">
            {recentMatches.length > 0 ? (
              recentMatches.map((match, idx) => (
                <div
                  key={idx}
                  className={`size-6 md:size-8 rounded-full flex items-center justify-center font-bold text-[10px] md:text-xs ${
                    match.result === "W"
                      ? "bg-primary text-[#0f2319] shadow-lg shadow-primary/20"
                      : match.result === "D"
                      ? "bg-gray-500 text-white"
                      : "bg-gray-600 text-white"
                  }`}
                  title={`${match.opponentName} ${match.homeScore}-${match.awayScore}`}
                >
                  {match.result}
                </div>
              ))
            ) : (
              <p className="text-[10px] md:text-xs text-gray-400">기록 없음</p>
            )}
          </div>
          <p className="text-[10px] md:text-xs text-gray-400 mt-0.5 md:mt-1 text-right">
            {recentMatches.length > 0 && recentMatches.filter((m) => m.result === "W").length >= 3
              ? "폼 상승 🔥"
              : ""}
          </p>
        </div>

        <div className="glass-card p-3 md:p-5 rounded-xl flex flex-col justify-between h-24 md:h-32">
          <div className="flex items-start justify-between">
            <p className="text-[#8eccae] text-xs md:text-sm font-medium">평균 득점</p>
            <span className="material-symbols-outlined text-[#8eccae] text-base md:text-xl">sports_soccer</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1 md:gap-2">
              <span className="text-xl md:text-3xl font-bold text-white">
                {stats.totalMatches > 0 ? stats.averageGoalsPerMatch : "0"}
              </span>
              <span className="text-xs md:text-sm text-primary font-medium">골</span>
            </div>
            <p className="text-[10px] md:text-xs text-gray-400 mt-0.5 md:mt-1">
              {stats.totalMatches > 0 ? `득 ${stats.totalGoalsScored} / 실 ${stats.totalGoalsConceded}` : "기록 없음"}
            </p>
          </div>
        </div>

        <div className="glass-card p-3 md:p-5 rounded-xl flex flex-col justify-between h-24 md:h-32 border-l-2 md:border-l-4 border-l-primary">
          <p className="text-[#8eccae] text-xs md:text-sm font-medium">다음 경기</p>
          <div className="min-w-0">
            {nextMatch ? (
              <>
                <p className="text-white font-bold text-sm md:text-base truncate">vs {nextMatch.opponent_name}</p>
                <p className="text-[10px] md:text-sm text-gray-300 mt-0.5 md:mt-1">
                  {formatDateTime(nextMatch.match_date)}
                </p>
              </>
            ) : (
              <>
                <p className="text-white font-bold text-sm md:text-base truncate">일정 없음</p>
                <p className="text-[10px] md:text-sm text-gray-300 mt-0.5 md:mt-1">경기 생성</p>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <section className="bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15 rounded-2xl p-6 md:p-8">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#00e677] rounded-full"></span>
              팀 소개
            </h3>
            {team.description ? (
              <div className="text-gray-300 max-w-none">
                <p className="leading-relaxed text-base whitespace-pre-wrap">{team.description}</p>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">아직 팀 소개가 작성되지 않았습니다.</p>
            )}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                <p className="text-[#8eccae] text-xs font-medium mb-1">주 활동 지역</p>
                <p className="text-white text-sm font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {team.region || "미설정"}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                <p className="text-[#8eccae] text-xs font-medium mb-1">주 활동 요일</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-white" />
                  {team.activity_days && team.activity_days.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {team.activity_days.map((day) => (
                        <span
                          key={day}
                          className="px-2 py-0.5 rounded bg-[#00e677]/20 text-[#00e677] text-xs font-medium"
                        >
                          {day}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-white text-sm font-semibold">미설정</span>
                  )}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                <p className="text-[#8eccae] text-xs font-medium mb-1">팀원 수</p>
                <p className="text-white text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {team.member_count || 0}명
                </p>
              </div>
              <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                <p className="text-[#8eccae] text-xs font-medium mb-1">모집 상태</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white text-sm font-semibold flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    {team.is_recruiting ? "모집중" : "모집 마감"}
                  </p>
                  {team.is_recruiting && team.recruiting_positions && (
                    <>
                      {(team.recruiting_positions.FW ?? 0) > 0 && (
                        <span className="px-2 py-0.5 rounded bg-[#00e677]/20 text-[#00e677] text-xs font-medium">
                          FW {team.recruiting_positions.FW}
                        </span>
                      )}
                      {(team.recruiting_positions.MF ?? 0) > 0 && (
                        <span className="px-2 py-0.5 rounded bg-[#00e677]/20 text-[#00e677] text-xs font-medium">
                          MF {team.recruiting_positions.MF}
                        </span>
                      )}
                      {(team.recruiting_positions.DF ?? 0) > 0 && (
                        <span className="px-2 py-0.5 rounded bg-[#00e677]/20 text-[#00e677] text-xs font-medium">
                          DF {team.recruiting_positions.DF}
                        </span>
                      )}
                      {(team.recruiting_positions.GK ?? 0) > 0 && (
                        <span className="px-2 py-0.5 rounded bg-[#00e677]/20 text-[#00e677] text-xs font-medium">
                          GK {team.recruiting_positions.GK}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15 rounded-2xl p-6 h-fit">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">팀 멤버 <span className="text-[#8eccae] text-base font-normal ml-1">{activeMembers.length}</span></h3>
              {isManager ? (
                <Link href={`/teams/${team.id}/manage/members`} className="text-xs text-[#8eccae] hover:text-white">관리하기</Link>
              ) : (
                <Link href={`/teams/${team.id}/squad`} className="text-xs text-[#8eccae] hover:text-white">전체보기</Link>
              )}
            </div>

            {activeMembers.length > 0 && activeMembers[0] && (
              <Link
                href={`/players/${activeMembers[0].id}`}
                className="flex items-center gap-4 mb-6 bg-gradient-to-r from-[#00e677]/20 to-transparent p-3 rounded-xl border border-[#00e677]/10 hover:bg-[#00e677]/10 transition-colors cursor-pointer"
              >
                <div className="relative">
                  {activeMembers[0].user?.avatar_url ? (
                    <img
                      src={activeMembers[0].user.avatar_url}
                      alt={activeMembers[0].user?.nickname || "Unknown"}
                      className="size-12 rounded-full object-cover border-2 border-[#00e677]"
                    />
                  ) : (
                    <div className="size-12 rounded-full bg-[#214a36] flex items-center justify-center text-[#00e677] font-bold">
                      {activeMembers[0].user?.nickname?.charAt(0) || "?"}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black rounded-full p-0.5 border border-[#10231a]">
                    <Star className="w-3 h-3" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[#00e677] font-bold uppercase tracking-wider">
                    {activeMembers[0].role === "OWNER" ? "Owner" : activeMembers[0].role === "MANAGER" ? "Manager" : "Member"}
                  </p>
                  <p className="text-white font-bold text-sm">{activeMembers[0].user?.nickname || "Unknown"}</p>
                  <p className="text-xs text-gray-400">{activeMembers[0].user?.position || "미지정"}</p>
                </div>
              </Link>
            )}

            <MemberList members={activeMembers.slice(1, 7)} isManager={isManager} />

            {activeMembers.length > 7 && (
              <div className="mt-4 text-center">
                <Link href="#" className="text-sm text-[#8eccae] hover:text-white">
                  +{activeMembers.length - 7}명 더보기
                </Link>
              </div>
            )}
          </section>

          {isManager && pendingMembers.length > 0 && (
            <section className="bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-yellow-400">가입 대기 <span className="text-yellow-400/70 text-base font-normal ml-1">{pendingMembers.length}</span></h3>
              </div>
              <MemberList members={pendingMembers} isManager={isManager} showActions />
            </section>
          )}


        </div>
      </div>


    </main>
  );
}
