import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Users, Calendar, Trophy, TrendingUp, Bell, Search, ChevronRight, Send, Zap, Shield, MessageCircle } from "lucide-react";
import type { Team, TeamMember, User } from "@/types/supabase";
import { getMyInvites } from "@/services/invites";
import { TeamInvitesSection } from "./team-invites-section";
import { getRecentMatches, getNextMatch } from "@/services/team-stats";
import { formatDateTime } from "@/lib/utils";

type TeamMemberWithTeam = TeamMember & { team: Team | null };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: userProfile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: myTeamsRaw } = await supabase
    .from("team_members")
    .select("*, team:teams(*)")
    .eq("user_id", user.id)
    .eq("status", "active");

  const myTeams = myTeamsRaw as TeamMemberWithTeam[] | null;

  const firstMembershipId = myTeams?.[0]?.id;
  const firstTeam = myTeams?.[0]?.team;
  let totalGoals = 0;
  let totalAssists = 0;
  let matchesPlayed = 0;

  if (firstMembershipId) {
    const { data: myStats } = await supabase
      .from("match_records")
      .select("goals, assists, match:matches!match_records_match_id_fkey(id, status)")
      .eq("team_member_id", firstMembershipId);

    if (myStats) {
      // FINISHED 상태의 경기만 카운트
      const finishedMatches = myStats.filter((record: any) => record.match?.status === "FINISHED");

      totalGoals = finishedMatches.reduce((sum: number, r: any) => sum + (r.goals || 0), 0);
      totalAssists = finishedMatches.reduce((sum: number, r: any) => sum + (r.assists || 0), 0);
      matchesPlayed = finishedMatches.length;
    }
  }

  // 첫 번째 팀의 최근 경기와 다음 경기 가져오기
  let recentMatches: any[] = [];
  let nextMatch: any = null;

  if (firstTeam) {
    try {
      recentMatches = await getRecentMatches(firstTeam.id, 5);
      nextMatch = await getNextMatch(firstTeam.id);
    } catch (error) {
      console.error("Failed to fetch team matches:", error);
    }
  }

  const typedProfile = userProfile as User | null;

  // 받은 팀 초대 가져오기
  const myInvites = await getMyInvites();

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden">
      <header className="sticky top-0 z-50 w-full bg-[#173627]/60 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="px-6 lg:px-10 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 text-white">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#00e677]/10 text-[#00e677]">
                <Zap className="w-6 h-6" />
              </div>
              <h2 className="text-white text-lg font-bold leading-tight tracking-tight">
                {firstTeam?.name || "Match Archive"}
              </h2>
            </div>
            <nav className="hidden md:flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/5">
              <Link href="/dashboard" className="px-4 py-1.5 rounded-full text-sm font-bold text-[#0f2319] bg-[#00e677] shadow-sm shadow-[#00e677]/20">
                라커룸
              </Link>
              <Link href="/teams" className="px-4 py-1.5 rounded-full text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all">
                팀
              </Link>
              <Link href="/matches" className="px-4 py-1.5 rounded-full text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all">
                경기
              </Link>
              <Link href="/profile" className="px-4 py-1.5 rounded-full text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all">
                프로필
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <label className="hidden md:flex flex-col min-w-40 h-9 max-w-64 group">
              <div className="flex w-full flex-1 items-stretch rounded-lg h-full bg-black/20 border border-white/10 focus-within:border-[#00e677]/50 transition-colors">
                <div className="text-white/50 flex items-center justify-center pl-3">
                  <Search className="w-5 h-5" />
                </div>
                <input className="flex w-full min-w-0 flex-1 bg-transparent text-white focus:outline-none border-none placeholder:text-white/30 px-3 text-sm font-normal" placeholder="선수 검색..." />
              </div>
            </label>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-full text-white/70 hover:bg-white/10 hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 size-2 rounded-full bg-red-500 ring-2 ring-[#0f2319]"></span>
              </button>
              <div className="h-8 w-[1px] bg-white/10 mx-1"></div>
              <div className="size-9 rounded-full bg-[#00e677]/20 flex items-center justify-center text-[#00e677] font-bold ring-2 ring-white/10">
                {typedProfile?.nickname?.charAt(0) || "U"}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 md:px-10 py-8 w-full max-w-[1440px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#00e677] text-sm font-bold tracking-wider uppercase">팀 대시보드</span>
              <div className="h-px w-8 bg-[#00e677]/30"></div>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">라커룸</h1>
            <p className="text-white/60 max-w-xl text-sm md:text-base">
              안녕하세요, {typedProfile?.nickname || "선수"}님! 선수단을 관리하고, 성과 데이터를 분석하며, 다가오는 경기를 준비하세요.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {firstTeam && myTeams && myTeams[0] && (myTeams[0].role === "OWNER" || myTeams[0].role === "MANAGER") ? (
              <Link href={`/teams/${firstTeam.id}/manage`} className="bg-white/[0.03] hover:bg-white/10 backdrop-blur-xl border border-white/[0.08] h-10 px-4 rounded-lg flex items-center gap-2 text-sm font-medium text-white transition-all">
                <Users className="w-5 h-5" />
                팀 관리
              </Link>
            ) : (
              <Link href="/teams" className="bg-white/[0.03] hover:bg-white/10 backdrop-blur-xl border border-white/[0.08] h-10 px-4 rounded-lg flex items-center gap-2 text-sm font-medium text-white transition-all">
                <Users className="w-5 h-5" />
                팀 찾기
              </Link>
            )}
            {firstTeam && (
              <Link href={`/teams/${firstTeam.id}/matches/new`} className="bg-[#00e677] hover:bg-green-400 text-[#0f2319] h-10 px-5 rounded-lg flex items-center gap-2 text-sm font-bold transition-all shadow-lg shadow-[#00e677]/20">
                <Calendar className="w-5 h-5" />
                경기 생성
              </Link>
            )}
          </div>
        </div>

        {/* 팀 초대 섹션 */}
        <TeamInvitesSection invites={myInvites} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="col-span-1 lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6 rounded-xl flex flex-col justify-between h-full min-h-[180px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#00e677]" />
                  최근 전적
                </h3>
                <span className="text-xs font-mono text-white/40">최근 5경기</span>
              </div>
              <div className="flex items-center justify-between relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/10 -z-10 transform -translate-y-1/2"></div>
                {recentMatches.length > 0 ? (
                  <>
                    {recentMatches.map((match, idx) => (
                      <MatchResultBadge
                        key={idx}
                        result={match.result === "W" ? "승" : match.result === "D" ? "무" : "패"}
                        score={`${match.homeScore}-${match.awayScore}`}
                      />
                    ))}
                    {/* 5개 미만일 경우 빈 공간 채우기 */}
                    {Array.from({ length: 5 - recentMatches.length }).map((_, idx) => (
                      <div key={`empty-${idx}`} className="size-12 rounded-full bg-white/5"></div>
                    ))}
                  </>
                ) : (
                  <p className="text-white/40 text-sm w-full text-center py-4">경기 기록이 없습니다</p>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-end">
                <span className="text-sm text-white/60">총 경기 수</span>
                <span className="text-2xl font-bold text-[#00e677]">{matchesPlayed}<span className="text-sm font-normal text-white/40 ml-1">경기</span></span>
              </div>
            </div>
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-5 rounded-xl flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-white/60 text-sm font-medium mb-1">소속 팀</span>
                <span className="text-white text-xl font-bold">{myTeams?.length ?? 0} <span className="text-sm font-normal text-white/40">팀</span></span>
              </div>
              <div className="size-12 rounded-full border-4 border-white/10 border-t-[#00e677] flex items-center justify-center">
                <Users className="w-5 h-5 text-[#00e677]" />
              </div>
            </div>
          </div>
          <div className="col-span-1 lg:col-span-8">
            <div className="relative w-full h-full min-h-[340px] rounded-2xl overflow-hidden group shadow-2xl shadow-black/50 border border-white/10">
              <div className="absolute inset-0 bg-gradient-to-br from-[#173627] to-[#0f2319]"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-[#0f2319] via-[#0f2319]/80 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f2319] via-transparent to-transparent"></div>
              <div className="relative h-full flex flex-col justify-between p-8 md:p-10">
                <div className="flex justify-between items-start">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00e677] text-[#0f2319] text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#00e677]/30">
                    <span className="size-2 rounded-full bg-[#0f2319] animate-pulse"></span>
                    다음 경기
                  </div>
                  {nextMatch ? (
                    <div className="flex flex-col items-end text-right">
                      <div className="text-[#00e677] font-bold text-lg">{formatDateTime(nextMatch.match_date).split(' ')[0]}</div>
                      <div className="text-white/70 text-sm font-medium">{formatDateTime(nextMatch.match_date).split(' ')[1]}</div>
                    </div>
                  ) : firstTeam ? (
                    <div className="flex flex-col items-end text-right">
                      <div className="text-white/40 font-bold text-lg">일정 없음</div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end text-right">
                      <div className="text-white/40 font-bold text-lg">팀 없음</div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col md:flex-row items-start md:items-end gap-6 md:gap-12 mt-8 md:mt-0">
                  {firstTeam ? (
                    <>
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col items-center gap-2">
                          <div className="size-20 bg-white/10 rounded-full p-2 backdrop-blur-md border border-white/10 shadow-lg">
                            {firstTeam.emblem_url ? (
                              <img src={firstTeam.emblem_url} alt={firstTeam.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <div className="w-full h-full rounded-full bg-[#1a4031] flex items-center justify-center">
                                <Zap className="w-10 h-10 text-[#00e677]" />
                              </div>
                            )}
                          </div>
                          <span className="text-white font-bold tracking-tight">{firstTeam.name}</span>
                        </div>
                        <div className="flex flex-col items-center pb-6">
                          <span className="text-4xl font-black text-white/20">VS</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <div className="size-20 bg-white/10 rounded-full p-2 backdrop-blur-md border border-white/10 shadow-lg">
                            {nextMatch?.opponent_team?.emblem_url ? (
                              <img
                                src={nextMatch.opponent_team.emblem_url}
                                alt={nextMatch.opponent_name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full rounded-full bg-gray-700 flex items-center justify-center text-white/50">
                                ?
                              </div>
                            )}
                          </div>
                          <span className="text-white font-bold tracking-tight">{nextMatch?.opponent_name || "상대팀"}</span>
                        </div>
                      </div>
                      <div className="flex-1 w-full md:w-auto">
                        <div className="flex flex-col gap-1 mb-6">
                          <h2 className="text-3xl font-black text-white leading-none">
                            {nextMatch ? `vs ${nextMatch.opponent_name}` : "다음 경기"}
                          </h2>
                          <div className="flex items-center gap-2 text-white/60 text-sm">
                            {nextMatch ? (
                              <>
                                <Calendar className="w-4 h-4" />
                                {formatDateTime(nextMatch.match_date)}
                                {nextMatch.location && ` · ${nextMatch.location}`}
                              </>
                            ) : (
                              "경기를 생성하여 일정을 관리하세요"
                            )}
                          </div>
                        </div>
                        <div className="flex gap-3">
                          {nextMatch ? (
                            <Link href={`/matches/${nextMatch.id}`} className="flex-1 md:flex-none h-11 px-6 bg-[#00e677] hover:bg-green-400 text-[#0f2319] text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,230,119,0.3)]">
                              경기 보기
                            </Link>
                          ) : (
                            <Link href={`/teams/${firstTeam.id}/matches/new`} className="flex-1 md:flex-none h-11 px-6 bg-[#00e677] hover:bg-green-400 text-[#0f2319] text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,230,119,0.3)]">
                              <Calendar className="w-5 h-5" />
                              경기 생성
                            </Link>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 w-full text-center py-8">
                      <p className="text-white/60 mb-4">소속된 팀이 없습니다</p>
                      <div className="flex gap-3 justify-center">
                        <Link href="/teams/new" className="h-11 px-6 bg-[#00e677] hover:bg-green-400 text-[#0f2319] text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
                          팀 만들기
                        </Link>
                        <Link href="/teams" className="h-11 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
                          팀 찾기
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#00e677]" />
            시즌 성과
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Trophy className="w-12 h-12" />}
              label="총 득점"
              value={totalGoals}
              trend={totalGoals > 0 ? "+12%" : undefined}
            />
            <StatCard
              icon={<TrendingUp className="w-12 h-12" />}
              label="총 어시스트"
              value={totalAssists}
              trend={totalAssists > 0 ? "+8%" : undefined}
            />
            <StatCard
              icon={<Shield className="w-12 h-12" />}
              label="경기 수"
              value={matchesPlayed}
              subtext="이번 시즌"
            />
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-0 rounded-xl relative overflow-hidden flex flex-col">
              <div className="p-5 flex-1 relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">MVP</span>
                  <p className="text-white/60 text-sm font-medium">내 포지션</p>
                </div>
                <h3 className="text-xl font-bold text-white">{typedProfile?.position || "미설정"}</h3>
                <p className="text-3xl font-black text-[#00e677] mt-1">{totalGoals + totalAssists} <span className="text-sm font-medium text-white/50">공헌</span></p>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] size-32 opacity-20 bg-gradient-to-tr from-[#00e677] to-transparent rounded-full blur-2xl"></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white text-xl font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#00e677]" />
                내 팀
              </h2>
              <Link href="/teams" className="text-[#00e677] text-sm font-medium hover:underline">팀 전체보기</Link>
            </div>
            <div className="flex flex-col gap-3">
              {myTeams && myTeams.length > 0 ? (
                myTeams.map((membership) => (
                  <Link
                    key={membership.id}
                    href={`/teams/${membership.team?.id}`}
                    className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-4 rounded-xl flex flex-col sm:flex-row items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <div className="flex flex-col items-center sm:items-start min-w-[80px] text-center sm:text-left">
                      <span className="text-[#00e677] font-bold text-sm">{membership.team?.name?.charAt(0)}</span>
                      <span className="text-white/50 text-xs font-medium">
                        {membership.role === "OWNER" ? "팀장" : membership.role === "MANAGER" ? "운영진" : "선수"}
                      </span>
                    </div>
                    <div className="h-10 w-px bg-white/10 hidden sm:block"></div>
                    <div className="flex-1 flex items-center justify-between w-full">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-full bg-[#00e677]/20 flex items-center justify-center text-[#00e677]">
                            <Zap className="w-4 h-4" />
                          </div>
                          <span className="text-white font-bold">{membership.team?.name}</span>
                        </div>
                        <span className="text-white/30 text-xs bg-white/5 px-2 py-0.5 rounded">{membership.team?.member_count || 0}명</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <div className="text-white/70 text-sm">{membership.team?.region || "지역 미설정"}</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-[#00e677] transition-colors" />
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-8 rounded-xl text-center">
                  <p className="text-white/60 mb-4">소속된 팀이 없습니다</p>
                  <div className="flex gap-3 justify-center">
                    <Link href="/teams/new" className="h-10 px-5 bg-[#00e677] hover:bg-green-400 text-[#0f2319] text-sm font-bold rounded-lg flex items-center justify-center transition-all">
                      팀 만들기
                    </Link>
                    <Link href="/teams" className="h-10 px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium rounded-lg flex items-center justify-center transition-all">
                      팀 찾기
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white text-xl font-bold flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[#00e677]" />
                공지사항
              </h2>
            </div>
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-0 rounded-xl flex-1 flex flex-col overflow-hidden min-h-[300px]">
              <div className="p-4 border-b border-white/5 bg-white/5">
                <p className="text-xs font-bold text-white/60 uppercase tracking-wider">최근 알림</p>
              </div>
              <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
                <div className="flex gap-3">
                  <div className="size-8 rounded-full bg-[#00e677]/20 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 text-[#00e677]" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-white font-bold text-sm">시스템</span>
                      <span className="text-white/30 text-[10px]">방금</span>
                    </div>
                    <p className="text-white/80 text-sm mt-1 leading-relaxed bg-white/5 p-2 rounded-lg rounded-tl-none">
                      Match Archive에 오신 것을 환영합니다! 팀을 만들거나 가입하여 시작하세요.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-black/20 border-t border-white/5">
                <div className="flex gap-2">
                  <input className="bg-white/5 border-none text-white text-sm rounded-lg flex-1 focus:ring-1 focus:ring-[#00e677]/50 placeholder:text-white/30 px-3 py-2" placeholder="메시지 입력..." type="text" />
                  <button className="size-9 bg-[#00e677] text-[#0f2319] rounded-lg flex items-center justify-center hover:bg-green-400 transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function MatchResultBadge({ result, score }: { result: "승" | "무" | "패"; score: string }) {
  const styles = {
    "승": "bg-[#00e677] text-[#0f2319] shadow-[0_0_15px_rgba(0,230,119,0.4)]",
    "무": "bg-white/20 text-white backdrop-blur-sm",
    "패": "bg-red-500/20 text-red-500 border border-red-500/30 backdrop-blur-sm",
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`size-10 rounded-full flex items-center justify-center font-black text-sm z-10 ${styles[result]}`}>
        {result}
      </div>
      <span className="text-[10px] font-bold text-white/50">{score}</span>
    </div>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  trend, 
  subtext 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  trend?: string; 
  subtext?: string;
}) {
  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6 rounded-xl relative overflow-hidden group">
      <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-white">
        {icon}
      </div>
      <p className="text-white/60 text-sm font-medium mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-4xl font-black text-white">{value}</h3>
        {trend && (
          <span className="text-[#00e677] text-sm font-bold flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" />
            {trend}
          </span>
        )}
      </div>
      {subtext && <p className="text-xs text-white/40 mt-3">{subtext}</p>}
      <div className="w-full bg-white/10 h-1 mt-4 rounded-full overflow-hidden">
        <div className="bg-[#00e677] h-full rounded-full shadow-[0_0_10px_#00e677]" style={{ width: `${Math.min(value * 5, 100)}%` }}></div>
      </div>
    </div>
  );
}
