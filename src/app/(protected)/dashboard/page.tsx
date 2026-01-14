import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Users, Calendar, Zap, Bell } from "lucide-react";
import type { Team, TeamMember, User, Venue } from "@/types/supabase";
import { getMyInvites } from "@/services/invites";
import { getMyMergeRequests } from "@/services/record-merge";
import { TeamInvitesSection } from "./team-invites-section";
import { MergeRequestsSection } from "./merge-requests-section";
import { getRecentMatches, getNextMatch } from "@/services/team-stats";
import { getTeamMembers } from "@/services/teams";
import { LockerRoomTabs } from "./locker-room-tabs";
import { TeamSwitcher } from "./team-switcher";

type TeamMemberWithTeam = TeamMember & { team: Team | null };
type TeamMemberWithUser = TeamMember & {
  user: Pick<User, "id" | "nickname" | "avatar_url" | "position"> | null;
};

interface DashboardPageProps {
  searchParams: Promise<{ team?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { team: selectedTeamId } = await searchParams;
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

  // 선택된 팀 찾기 (쿼리 파라미터가 있으면 해당 팀, 없으면 첫 번째 팀)
  const currentMembership = selectedTeamId
    ? myTeams?.find((m) => m.team?.id === selectedTeamId) || myTeams?.[0]
    : myTeams?.[0];

  const currentMembershipId = currentMembership?.id;
  const currentTeam = currentMembership?.team;

  let totalGoals = 0;
  let totalAssists = 0;
  let matchesPlayed = 0;

  if (currentMembershipId) {
    const { data: myStats } = await supabase
      .from("match_records")
      .select("goals, assists, match:matches!match_records_match_id_fkey(id, status)")
      .eq("team_member_id", currentMembershipId);

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

  if (currentTeam) {
    try {
      recentMatches = await getRecentMatches(currentTeam.id, 5);
      nextMatch = await getNextMatch(currentTeam.id);
      members = await getTeamMembers(currentTeam.id);

      const { data: venueData } = await supabase
        .from("venues")
        .select("*")
        .eq("team_id", currentTeam.id)
        .order("is_primary", { ascending: false });

      venues = (venueData || []) as Venue[];
    } catch (error) {
      console.error("Failed to fetch team data:", error);
    }
  }

  const typedProfile = userProfile as User | null;
  const myInvites = await getMyInvites();
  const myMergeRequests = await getMyMergeRequests();

  const isManager =
    currentMembership?.role === "OWNER" || currentMembership?.role === "MANAGER";

  // 팀 목록 (팀 전환용)
  const teamList = myTeams?.map((m) => ({
    id: m.team?.id || "",
    name: m.team?.name || "",
    emblem_url: m.team?.emblem_url || null,
    role: m.role,
  })).filter((t) => t.id) || [];

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden">
      <header className="sticky top-0 z-50 w-full bg-[#173627]/60 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="px-6 lg:px-10 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={currentTeam ? `/teams/${currentTeam.id}` : "/dashboard"} className="flex items-center gap-3 text-white">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#00e677]/10 text-[#00e677] overflow-hidden">
                {currentTeam?.emblem_url ? (
                  <img
                    src={currentTeam.emblem_url}
                    alt={currentTeam.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Zap className="w-6 h-6" />
                )}
              </div>
              <h2 className="text-white text-lg font-bold leading-tight tracking-tight">
                {currentTeam?.name || "Match Archive"}
              </h2>
            </Link>
            {/* 팀 전환 메뉴 */}
            {teamList.length > 1 && (
              <TeamSwitcher
                teams={teamList}
                currentTeamId={currentTeam?.id || ""}
              />
            )}
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-full text-white/70 hover:bg-white/10 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-red-500 ring-2 ring-[#0f2319]"></span>
            </button>
            <div className="h-8 w-[1px] bg-white/10 mx-1"></div>
            <Link href="/profile">
              {typedProfile?.avatar_url ? (
                <img
                  src={typedProfile.avatar_url}
                  alt={typedProfile.nickname || "User"}
                  className="size-9 rounded-full object-cover ring-2 ring-white/10 hover:ring-[#00e677]/50 transition-all"
                />
              ) : (
                <div className="size-9 rounded-full bg-[#00e677]/20 flex items-center justify-center text-[#00e677] font-bold ring-2 ring-white/10 hover:ring-[#00e677]/50 transition-all">
                  {typedProfile?.nickname?.charAt(0) || "U"}
                </div>
              )}
            </Link>
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
            {currentTeam && currentMembership && (currentMembership.role === "OWNER" || currentMembership.role === "MANAGER") ? (
              <Link href={`/teams/${currentTeam.id}/manage`} className="bg-white/[0.03] hover:bg-white/10 backdrop-blur-xl border border-white/[0.08] h-10 px-4 rounded-lg flex items-center gap-2 text-sm font-medium text-white transition-all">
                <Users className="w-5 h-5" />
                팀 관리
              </Link>
            ) : (
              <Link href="/teams" className="bg-white/[0.03] hover:bg-white/10 backdrop-blur-xl border border-white/[0.08] h-10 px-4 rounded-lg flex items-center gap-2 text-sm font-medium text-white transition-all">
                <Users className="w-5 h-5" />
                팀 찾기
              </Link>
            )}
            {currentTeam && (
              <Link href={`/teams/${currentTeam.id}/matches/new`} className="bg-[#00e677] hover:bg-green-400 text-[#0f2319] h-10 px-5 rounded-lg flex items-center gap-2 text-sm font-bold transition-all shadow-lg shadow-[#00e677]/20">
                <Calendar className="w-5 h-5" />
                경기 생성
              </Link>
            )}
          </div>
        </div>

        {/* 팀 초대 섹션 */}
        <TeamInvitesSection invites={myInvites} />

        {/* 기록 병합 요청 섹션 */}
        <MergeRequestsSection requests={myMergeRequests} />

        {/* 탭 컴포넌트 */}
        <LockerRoomTabs
          firstTeam={currentTeam || null}
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
