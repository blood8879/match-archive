import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Users, Calendar, Zap } from "lucide-react";
import type { Team, TeamMember, User, Venue } from "@/types/supabase";
import { getRecentMatches, getNextMatch, getTeamDetailedStats, getTeamAvailableYears, getTeamSeasonSummary, type TeamDetailedStats, type TeamSeasonSummary } from "@/services/team-stats";
import { getTeamMembers } from "@/services/teams";
import { getNotifications } from "@/services/notifications";
import { getWeather, type WeatherData } from "@/services/weather";
import { LockerRoomTabs } from "./locker-room-tabs";
import { TeamSwitcher } from "./team-switcher";
import { NotificationDropdown } from "./notification-dropdown";
import { PushNotificationBanner } from "@/components/push-notification-toggle";

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

  // 대표클럽(primary_team_id)을 우선으로 팀 정렬
  const sortedTeams = myTeams?.slice().sort((a, b) => {
    const primaryTeamId = userProfile?.primary_team_id;
    if (!primaryTeamId) return 0;
    if (a.team?.id === primaryTeamId) return -1;
    if (b.team?.id === primaryTeamId) return 1;
    return 0;
  });

  // 선택된 팀 찾기 (쿼리 파라미터가 있으면 해당 팀, 없으면 대표클럽 또는 첫 번째 팀)
  const currentMembership = selectedTeamId
    ? sortedTeams?.find((m) => m.team?.id === selectedTeamId) || sortedTeams?.[0]
    : sortedTeams?.[0];

  const currentMembershipId = currentMembership?.id;
  const currentTeam = currentMembership?.team;

  let allTimeGoals = 0;
  let allTimeAssists = 0;
  let allTimeMatchesPlayed = 0;
  let allTimeAttendanceRate = 0;

  if (currentMembershipId && currentTeam) {
    const { data: myStats } = await supabase
      .from("match_records")
      .select("goals, assists, match:matches!match_records_match_id_fkey(id, status, match_date)")
      .eq("team_member_id", currentMembershipId);

    if (myStats) {
      const finishedMatches = myStats.filter((record: any) => record.match?.status === "FINISHED");
      allTimeGoals = finishedMatches.reduce((sum: number, r: any) => sum + (r.goals || 0), 0);
      allTimeAssists = finishedMatches.reduce((sum: number, r: any) => sum + (r.assists || 0), 0);
      allTimeMatchesPlayed = finishedMatches.length;
    }

    const { count: allTimeTeamMatchCount } = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("team_id", currentTeam.id)
      .eq("status", "FINISHED");

    const allTimeTeamMatches = allTimeTeamMatchCount || 0;
    allTimeAttendanceRate = allTimeTeamMatches > 0 ? Math.round((allTimeMatchesPlayed / allTimeTeamMatches) * 100) : 0;
  }

  let recentMatches: any[] = [];
  let nextMatch: any = null;
  let members: TeamMemberWithUser[] = [];
  let venues: Venue[] = [];
  let teamDetailedStats: TeamDetailedStats | null = null;
  let availableYears: number[] = [];
  let teamSeasonSummary: TeamSeasonSummary = { totalGoals: 0, totalAssists: 0, totalMatches: 0, maxWinStreak: 0, seasonYear: new Date().getFullYear() };

  let nextMatchWeather: WeatherData | null = null;

  if (currentTeam) {
    try {
      recentMatches = await getRecentMatches(currentTeam.id, 5);
      nextMatch = await getNextMatch(currentTeam.id);
      members = await getTeamMembers(currentTeam.id);
      availableYears = await getTeamAvailableYears(currentTeam.id);
      teamDetailedStats = await getTeamDetailedStats(currentTeam.id);
      teamSeasonSummary = await getTeamSeasonSummary(currentTeam.id);

      const { data: venueData } = await supabase
        .from("venues")
        .select("*")
        .eq("team_id", currentTeam.id)
        .is("deleted_at", null)
        .order("is_primary", { ascending: false });

      venues = (venueData || []) as Venue[];

      if (nextMatch?.venue?.latitude && nextMatch?.venue?.longitude) {
        const matchTime = nextMatch.match_date.split("T")[1]?.substring(0, 5);
        nextMatchWeather = await getWeather(
          nextMatch.venue.latitude,
          nextMatch.venue.longitude,
          nextMatch.match_date.split("T")[0],
          matchTime
        );
      }
    } catch (error) {
      console.error("Failed to fetch team data:", error);
    }
  }

  const typedProfile = userProfile as User | null;
  const notifications = await getNotifications({ limit: 20 });

  const isManager =
    currentMembership?.role === "OWNER" || currentMembership?.role === "MANAGER";

  // 팀 목록 (팀 전환용) - 대표클럽이 우선 표시되도록 정렬된 목록 사용
  const teamList = sortedTeams?.map((m) => ({
    id: m.team?.id || "",
    name: m.team?.name || "",
    emblem_url: m.team?.emblem_url || null,
    role: m.role,
  })).filter((t) => t.id) || [];

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden">
      <header className="sticky top-0 z-50 w-full bg-[#173627]/60 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="px-3 md:px-6 lg:px-10 py-2 md:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
            <Link href={currentTeam ? `/teams/${currentTeam.id}` : "/dashboard"} className="flex items-center gap-2 md:gap-3 text-white min-w-0">
              <div className="flex size-8 md:size-10 items-center justify-center rounded-lg bg-[#00e677]/10 text-[#00e677] overflow-hidden shrink-0">
                {currentTeam?.emblem_url ? (
                  <img
                    src={currentTeam.emblem_url}
                    alt={currentTeam.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Zap className="w-5 h-5 md:w-6 md:h-6" />
                )}
              </div>
              <h2 className="text-white text-base md:text-lg font-bold leading-tight tracking-tight truncate">
                {currentTeam?.name || "Match Archive"}
              </h2>
            </Link>
            {teamList.length > 1 && (
              <TeamSwitcher
                teams={teamList}
                currentTeamId={currentTeam?.id || ""}
              />
            )}
          </div>
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <NotificationDropdown notifications={notifications} />
            <div className="h-6 md:h-8 w-[1px] bg-white/10 mx-0.5 md:mx-1 hidden sm:block"></div>
            <Link href="/profile">
              {typedProfile?.avatar_url ? (
                <img
                  src={typedProfile.avatar_url}
                  alt={typedProfile.nickname || "User"}
                  className="size-8 md:size-9 rounded-full object-cover ring-2 ring-white/10 hover:ring-[#00e677]/50 transition-all"
                />
              ) : (
                <div className="size-8 md:size-9 rounded-full bg-[#00e677]/20 flex items-center justify-center text-[#00e677] font-bold text-sm ring-2 ring-white/10 hover:ring-[#00e677]/50 transition-all">
                  {typedProfile?.nickname?.charAt(0) || "U"}
                </div>
              )}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 px-3 md:px-10 py-4 md:py-8 w-full max-w-[1440px] mx-auto">
        <PushNotificationBanner />
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-6 md:mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#00e677] text-xs md:text-sm font-bold tracking-wider uppercase">팀 대시보드</span>
              <div className="h-px w-6 md:w-8 bg-[#00e677]/30"></div>
            </div>
            <h1 className="text-2xl md:text-5xl font-black text-white tracking-tight mb-1 md:mb-2">라커룸</h1>
            <p className="text-white/60 max-w-xl text-xs md:text-base hidden sm:block">
              안녕하세요, {typedProfile?.nickname || "선수"}님! 선수단을 관리하고, 성과 데이터를 분석하며, 다가오는 경기를 준비하세요.
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {currentTeam && currentMembership && (currentMembership.role === "OWNER" || currentMembership.role === "MANAGER") ? (
              <Link href={`/teams/${currentTeam.id}/manage`} className="bg-white/[0.03] hover:bg-white/10 backdrop-blur-xl border border-white/[0.08] h-9 md:h-10 px-3 md:px-4 rounded-lg flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium text-white transition-all">
                <Users className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">팀 관리</span>
                <span className="sm:hidden">관리</span>
              </Link>
            ) : (
              <Link href="/teams" className="bg-white/[0.03] hover:bg-white/10 backdrop-blur-xl border border-white/[0.08] h-9 md:h-10 px-3 md:px-4 rounded-lg flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium text-white transition-all">
                <Users className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">팀 찾기</span>
                <span className="sm:hidden">팀</span>
              </Link>
            )}
            {currentTeam && isManager && (
              <Link href={`/teams/${currentTeam.id}/matches/new`} className="bg-[#00e677] hover:bg-green-400 text-[#0f2319] h-9 md:h-10 px-3 md:px-5 rounded-lg flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-bold transition-all shadow-lg shadow-[#00e677]/20">
                <Calendar className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">경기 생성</span>
                <span className="sm:hidden">경기</span>
              </Link>
            )}
          </div>
        </div>

        {/* 탭 컴포넌트 */}
        <LockerRoomTabs
          firstTeam={currentTeam || null}
          myTeams={sortedTeams || null}
          typedProfile={typedProfile}
          recentMatches={recentMatches}
          nextMatch={nextMatch}
          nextMatchWeather={nextMatchWeather}
          allTimeGoals={allTimeGoals}
          allTimeAssists={allTimeAssists}
          allTimeMatchesPlayed={allTimeMatchesPlayed}
          allTimeAttendanceRate={allTimeAttendanceRate}
          members={members}
          venues={venues}
          isManager={isManager}
          teamDetailedStats={teamDetailedStats}
          availableYears={availableYears}
          teamSeasonSummary={teamSeasonSummary}
        />
      </main>
    </div>
  );
}
