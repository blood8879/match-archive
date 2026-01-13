import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Users, Calendar, Zap, Bell, Search } from "lucide-react";
import type { Team, TeamMember, User, Venue } from "@/types/supabase";
import { getMyInvites } from "@/services/invites";
import { TeamInvitesSection } from "./team-invites-section";
import { getRecentMatches, getNextMatch } from "@/services/team-stats";
import { getTeamMembers } from "@/services/teams";
import { LockerRoomTabs } from "./locker-room-tabs";

type TeamMemberWithTeam = TeamMember & { team: Team | null };
type TeamMemberWithUser = TeamMember & {
  user: Pick<User, "id" | "nickname" | "avatar_url" | "position"> | null;
};

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
  const firstMembership = myTeams?.[0];
  let totalGoals = 0;
  let totalAssists = 0;
  let matchesPlayed = 0;

  if (firstMembershipId) {
    const { data: myStats } = await supabase
      .from("match_records")
      .select("goals, assists, match:matches!match_records_match_id_fkey(id, status)")
      .eq("team_member_id", firstMembershipId);

    if (myStats) {
      const finishedMatches = myStats.filter((record: any) => record.match?.status === "FINISHED");

      totalGoals = finishedMatches.reduce((sum: number, r: any) => sum + (r.goals || 0), 0);
      totalAssists = finishedMatches.reduce((sum: number, r: any) => sum + (r.assists || 0), 0);
      matchesPlayed = finishedMatches.length;
    }
  }

  let recentMatches: any[] = [];
  let nextMatch: any = null;
  let members: TeamMemberWithUser[] = [];
  let venues: Venue[] = [];

  if (firstTeam) {
    try {
      recentMatches = await getRecentMatches(firstTeam.id, 5);
      nextMatch = await getNextMatch(firstTeam.id);
      members = await getTeamMembers(firstTeam.id);

      // 경기장 정보 가져오기
      const { data: venueData } = await supabase
        .from("venues")
        .select("*")
        .eq("team_id", firstTeam.id)
        .order("is_primary", { ascending: false });

      venues = (venueData || []) as Venue[];
    } catch (error) {
      console.error("Failed to fetch team data:", error);
    }
  }

  const typedProfile = userProfile as User | null;
  const myInvites = await getMyInvites();

  const isManager =
    firstMembership?.role === "OWNER" || firstMembership?.role === "MANAGER";

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
              {typedProfile?.avatar_url ? (
                <img
                  src={typedProfile.avatar_url}
                  alt={typedProfile.nickname || "User"}
                  className="size-9 rounded-full object-cover ring-2 ring-white/10"
                />
              ) : (
                <div className="size-9 rounded-full bg-[#00e677]/20 flex items-center justify-center text-[#00e677] font-bold ring-2 ring-white/10">
                  {typedProfile?.nickname?.charAt(0) || "U"}
                </div>
              )}
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

        {/* 탭 컴포넌트 */}
        <LockerRoomTabs
          firstTeam={firstTeam || null}
          myTeams={myTeams}
          typedProfile={typedProfile}
          recentMatches={recentMatches}
          nextMatch={nextMatch}
          totalGoals={totalGoals}
          totalAssists={totalAssists}
          matchesPlayed={matchesPlayed}
          members={members}
          venues={venues}
          isManager={isManager}
        />
      </main>
    </div>
  );
}
