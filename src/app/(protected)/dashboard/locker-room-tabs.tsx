"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Users,
  Calendar,
  Trophy,
  TrendingUp,
  Bell,
  ChevronRight,
  Send,
  Zap,
  Shield,
  MessageCircle,
  BarChart3,
  UsersRound,
  MapPin,
  Flame,
  UserCheck,
  PieChart,
  Target,
  Star,
  Handshake,
  X,
} from "lucide-react";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Team, TeamMember, User, Venue } from "@/types/supabase";
import type { TeamDetailedStats, TeamSeasonSummary } from "@/services/team-stats";
import { fetchTeamStatsBySeason } from "./actions";
import { formatDateTime } from "@/lib/utils";

type TeamMemberWithTeam = TeamMember & { team: Team | null };
type TeamMemberWithUser = TeamMember & {
  user: Pick<User, "id" | "nickname" | "avatar_url" | "position"> | null;
};



interface LockerRoomTabsProps {
  firstTeam: Team | null;
  myTeams: TeamMemberWithTeam[] | null;
  typedProfile: User | null;
  recentMatches: any[];
  nextMatch: any;
  allTimeGoals: number;
  allTimeAssists: number;
  allTimeMatchesPlayed: number;
  allTimeAttendanceRate: number;
  members: TeamMemberWithUser[];
  venues: Venue[];
  isManager: boolean;
  teamDetailedStats: TeamDetailedStats | null;
  availableYears: number[];
  teamSeasonSummary: TeamSeasonSummary;
}

type TabType = "locker" | "stats" | "team-stats" | "squad" | "venue";

export function LockerRoomTabs({
  firstTeam,
  myTeams,
  typedProfile,
  recentMatches,
  nextMatch,
  allTimeGoals,
  allTimeAssists,
  allTimeMatchesPlayed,
  allTimeAttendanceRate,
  members,
  venues,
  isManager,
  teamDetailedStats,
  availableYears,
  teamSeasonSummary,
}: LockerRoomTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("locker");

  const tabs = [
    { id: "locker" as const, label: "라커룸", icon: Zap },
    { id: "stats" as const, label: "기록", icon: BarChart3 },
    { id: "team-stats" as const, label: "팀 통계", icon: PieChart },
    { id: "squad" as const, label: "스쿼드", icon: UsersRound },
    { id: "venue" as const, label: "경기장", icon: MapPin },
  ];

  const activeMembers = members.filter((m) => m.status === "active" && !m.is_guest);

  return (
    <>
      {/* Sub Tabs */}
      <div className="mb-4 md:mb-6 overflow-x-auto scrollbar-hide -mx-3 px-3 md:mx-0 md:px-0">
        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/5 w-fit min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all flex items-center gap-1.5 md:gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-[#00e677] text-[#0f2319] shadow-sm shadow-[#00e677]/20"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "locker" && (
        <LockerContent
          firstTeam={firstTeam}
          myTeams={myTeams}
          typedProfile={typedProfile}
          recentMatches={recentMatches}
          nextMatch={nextMatch}
          teamSeasonSummary={teamSeasonSummary}
          isManager={isManager}
        />
      )}

      {activeTab === "stats" && (
        <StatsContent
          allTimeGoals={allTimeGoals}
          allTimeAssists={allTimeAssists}
          allTimeMatchesPlayed={allTimeMatchesPlayed}
          allTimeAttendanceRate={allTimeAttendanceRate}
          typedProfile={typedProfile}
        />
      )}

      {activeTab === "squad" && (
        <SquadContent
          members={activeMembers}
          firstTeam={firstTeam}
          isManager={isManager}
        />
      )}

      {activeTab === "venue" && (
        <VenueContent venues={venues} firstTeam={firstTeam} isManager={isManager} />
      )}

      {activeTab === "team-stats" && (
        <TeamStatsContent teamDetailedStats={teamDetailedStats} firstTeam={firstTeam} availableYears={availableYears} />
      )}
    </>
  );
}

function LockerContent({
  firstTeam,
  myTeams,
  typedProfile: _typedProfile,
  recentMatches,
  nextMatch,
  teamSeasonSummary,
  isManager,
}: {
  firstTeam: Team | null;
  myTeams: TeamMemberWithTeam[] | null;
  typedProfile: User | null;
  recentMatches: any[];
  nextMatch: any;
  teamSeasonSummary: TeamSeasonSummary;
  isManager: boolean;
}) {
  return (
    <>
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
              <span className="text-2xl font-bold text-[#00e677]">
                {teamSeasonSummary.totalMatches}
                <span className="text-sm font-normal text-white/40 ml-1">경기</span>
              </span>
            </div>
          </div>
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-5 rounded-xl flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-white/60 text-sm font-medium mb-1">소속 팀</span>
              <span className="text-white text-xl font-bold">
                {myTeams?.length ?? 0} <span className="text-sm font-normal text-white/40">팀</span>
              </span>
            </div>
            <div className="size-12 rounded-full border-4 border-white/10 border-t-[#00e677] flex items-center justify-center">
              <Users className="w-5 h-5 text-[#00e677]" />
            </div>
          </div>
        </div>
        <div className="col-span-1 lg:col-span-8">
          <NextMatchCard firstTeam={firstTeam} nextMatch={nextMatch} isManager={isManager} />
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#00e677]" />
          {firstTeam?.name || "팀"} {teamSeasonSummary.seasonYear} 시즌 성과
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Trophy className="w-12 h-12" />}
            label="팀 총득점"
            value={teamSeasonSummary.totalGoals}
          />
          <StatCard
            icon={<TrendingUp className="w-12 h-12" />}
            label="팀 총어시스트"
            value={teamSeasonSummary.totalAssists}
          />
          <StatCard
            icon={<Shield className="w-12 h-12" />}
            label="팀 경기수"
            value={teamSeasonSummary.totalMatches}
            subtext="이번 시즌"
          />
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-0 rounded-xl relative overflow-hidden flex flex-col">
            <div className="p-5 flex-1 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-500 border border-orange-500/30">
                  <Flame className="w-3 h-3 inline-block mr-1" />
                  STREAK
                </span>
                <p className="text-white/60 text-sm font-medium">최다연승</p>
              </div>
              <p className="text-4xl font-black text-white mt-2">
                {teamSeasonSummary.maxWinStreak}
                <span className="text-sm font-medium text-white/50 ml-2">연승</span>
              </p>
              <p className="text-xs text-white/40 mt-2">
                {teamSeasonSummary.maxWinStreak > 0
                  ? `시즌 최다 ${teamSeasonSummary.maxWinStreak}연승 달성!`
                  : "연승 기록을 만들어보세요"}
              </p>
            </div>
            <div className="absolute right-[-20px] bottom-[-20px] size-32 opacity-20 bg-gradient-to-tr from-orange-500 to-transparent rounded-full blur-2xl"></div>
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
            <Link href="/teams" className="text-[#00e677] text-sm font-medium hover:underline">
              팀 전체보기
            </Link>
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
                    <span className="text-[#00e677] font-bold text-sm">
                      {membership.team?.name?.charAt(0)}
                    </span>
                    <span className="text-white/50 text-xs font-medium">
                      {membership.role === "OWNER"
                        ? "팀장"
                        : membership.role === "MANAGER"
                        ? "운영진"
                        : "선수"}
                    </span>
                  </div>
                  <div className="h-10 w-px bg-white/10 hidden sm:block"></div>
                  <div className="flex-1 flex items-center justify-between w-full">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {membership.team?.emblem_url ? (
                          <img
                            src={membership.team.emblem_url}
                            alt={membership.team.name || "Team"}
                            className="size-8 rounded-full object-cover border-2 border-[#214a36]"
                          />
                        ) : (
                          <div className="size-8 rounded-full bg-[#00e677]/20 flex items-center justify-center text-[#00e677]">
                            <Zap className="w-4 h-4" />
                          </div>
                        )}
                        <span className="text-white font-bold">{membership.team?.name}</span>
                      </div>
                      <span className="text-white/30 text-xs bg-white/5 px-2 py-0.5 rounded">
                        {membership.team?.member_count || 0}명
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <div className="text-white/70 text-sm">
                          {membership.team?.region || "지역 미설정"}
                        </div>
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
                  <Link
                    href="/teams/new"
                    className="h-10 px-5 bg-[#00e677] hover:bg-green-400 text-[#0f2319] text-sm font-bold rounded-lg flex items-center justify-center transition-all"
                  >
                    팀 만들기
                  </Link>
                  <Link
                    href="/teams"
                    className="h-10 px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium rounded-lg flex items-center justify-center transition-all"
                  >
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
                <input
                  className="bg-white/5 border-none text-white text-sm rounded-lg flex-1 focus:ring-1 focus:ring-[#00e677]/50 placeholder:text-white/30 px-3 py-2"
                  placeholder="메시지 입력..."
                  type="text"
                />
                <button className="size-9 bg-[#00e677] text-[#0f2319] rounded-lg flex items-center justify-center hover:bg-green-400 transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatsContent({
  allTimeGoals,
  allTimeAssists,
  allTimeMatchesPlayed,
  allTimeAttendanceRate,
  typedProfile,
}: {
  allTimeGoals: number;
  allTimeAssists: number;
  allTimeMatchesPlayed: number;
  allTimeAttendanceRate: number;
  typedProfile: User | null;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-5 h-5 text-[#00e677]" />
        <h2 className="text-xl font-bold text-white">통산 기록</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Trophy className="w-12 h-12" />}
          label="통산 득점"
          value={allTimeGoals}
        />
        <StatCard
          icon={<TrendingUp className="w-12 h-12" />}
          label="통산 어시스트"
          value={allTimeAssists}
        />
        <StatCard
          icon={<Shield className="w-12 h-12" />}
          label="통산 경기수"
          value={allTimeMatchesPlayed}
        />
        <StatCard
          icon={<UserCheck className="w-12 h-12" />}
          label="통산 출석률"
          value={allTimeAttendanceRate}
          suffix="%"
        />
      </div>

      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6 rounded-xl">
        <h3 className="text-lg font-bold text-white mb-4">개인 통계</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-white/60">포지션</span>
            <span className="text-white font-bold">{typedProfile?.position || "미설정"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60">경기당 득점</span>
            <span className="text-white font-bold">
              {allTimeMatchesPlayed > 0 ? (allTimeGoals / allTimeMatchesPlayed).toFixed(2) : "0.00"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60">경기당 어시스트</span>
            <span className="text-white font-bold">
              {allTimeMatchesPlayed > 0 ? (allTimeAssists / allTimeMatchesPlayed).toFixed(2) : "0.00"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 스쿼드 탭 콘텐츠
function SquadContent({
  members,
  firstTeam,
  isManager,
}: {
  members: TeamMemberWithUser[];
  firstTeam: Team | null;
  isManager: boolean;
}) {
  const positions = ["FW", "MF", "DF", "GK"];
  const positionLabels: Record<string, string> = {
    FW: "공격수",
    MF: "미드필더",
    DF: "수비수",
    GK: "골키퍼",
  };

  return (
    <div className="space-y-6">
      {firstTeam ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <UsersRound className="w-5 h-5 text-[#00e677]" />
              선수 명단
              <span className="text-white/40 text-sm font-normal ml-2">{members.length}명</span>
            </h3>
            {isManager && (
              <Link
                href={`/teams/${firstTeam.id}/manage/members`}
                className="text-[#00e677] text-sm font-medium hover:underline"
              >
                관리하기
              </Link>
            )}
          </div>

          {positions.map((pos) => {
            // team_positions를 우선 확인, 없으면 user.position 확인
            const positionMembers = members.filter((m) => {
              const teamPositions = m.team_positions || [];
              if (teamPositions.length > 0) {
                return teamPositions.includes(pos);
              }
              return m.user?.position === pos;
            });
            if (positionMembers.length === 0) return null;

            return (
              <div key={pos} className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6 rounded-xl">
                <h4 className="text-sm font-bold text-[#00e677] mb-4 uppercase tracking-wider">
                  {positionLabels[pos]} ({positionMembers.length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {positionMembers.map((member) => (
                    <Link
                      key={member.id}
                      href={`/players/${member.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      {member.user?.avatar_url ? (
                        <img
                          src={member.user.avatar_url}
                          alt={member.user?.nickname || ""}
                          className="size-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="size-10 rounded-full bg-[#00e677]/20 flex items-center justify-center text-[#00e677] font-bold">
                          {member.user?.nickname?.charAt(0) || "?"}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium text-sm">{member.user?.nickname || "Unknown"}</p>
                        {member.back_number && (
                          <p className="text-white/40 text-xs">#{member.back_number}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}

          {/* 포지션 미설정 선수들 */}
          {(() => {
            // team_positions가 없고 user.position도 없는 경우만 포지션 미설정
            const unassigned = members.filter((m) => {
              const teamPositions = m.team_positions || [];
              return teamPositions.length === 0 && !m.user?.position;
            });
            if (unassigned.length === 0) return null;

            return (
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6 rounded-xl">
                <h4 className="text-sm font-bold text-white/60 mb-4 uppercase tracking-wider">
                  포지션 미설정 ({unassigned.length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {unassigned.map((member) => (
                    <Link
                      key={member.id}
                      href={`/players/${member.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      {member.user?.avatar_url ? (
                        <img
                          src={member.user.avatar_url}
                          alt={member.user?.nickname || ""}
                          className="size-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="size-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold">
                          {member.user?.nickname?.charAt(0) || "?"}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium text-sm">{member.user?.nickname || "Unknown"}</p>
                        {member.back_number && (
                          <p className="text-white/40 text-xs">#{member.back_number}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })()}
        </>
      ) : (
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-8 rounded-xl text-center">
          <p className="text-white/60 mb-4">소속된 팀이 없습니다</p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/teams/new"
              className="h-10 px-5 bg-[#00e677] hover:bg-green-400 text-[#0f2319] text-sm font-bold rounded-lg flex items-center justify-center transition-all"
            >
              팀 만들기
            </Link>
            <Link
              href="/teams"
              className="h-10 px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium rounded-lg flex items-center justify-center transition-all"
            >
              팀 찾기
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// 경기장 탭 콘텐츠
function VenueContent({
  venues,
  firstTeam,
  isManager,
}: {
  venues: Venue[];
  firstTeam: Team | null;
  isManager: boolean;
}) {
  return (
    <div className="space-y-6">
      {firstTeam ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#00e677]" />
              등록된 경기장
              <span className="text-white/40 text-sm font-normal ml-2">{venues.length}개</span>
            </h3>
            {isManager && (
              <Link
                href={`/teams/${firstTeam.id}/venues`}
                className="text-[#00e677] text-sm font-medium hover:underline"
              >
                관리하기
              </Link>
            )}
          </div>

          {venues.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {venues.map((venue) => (
                <div
                  key={venue.id}
                  className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6 rounded-xl"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-[#00e677]/10 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-[#00e677]" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold">{venue.name}</h4>
                        {venue.is_primary && (
                          <span className="text-[10px] font-bold bg-[#00e677]/20 text-[#00e677] px-2 py-0.5 rounded">
                            홈구장
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-white/60 text-sm">{venue.address}</p>
                  {venue.address_detail && (
                    <p className="text-white/40 text-sm mt-1">{venue.address_detail}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-8 rounded-xl text-center">
              <MapPin className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/60 mb-4">등록된 경기장이 없습니다</p>
              {isManager && (
                <Link
                  href={`/teams/${firstTeam.id}/venues`}
                  className="inline-flex h-10 px-5 bg-[#00e677] hover:bg-green-400 text-[#0f2319] text-sm font-bold rounded-lg items-center justify-center transition-all"
                >
                  경기장 등록하기
                </Link>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-8 rounded-xl text-center">
          <p className="text-white/60 mb-4">소속된 팀이 없습니다</p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/teams/new"
              className="h-10 px-5 bg-[#00e677] hover:bg-green-400 text-[#0f2319] text-sm font-bold rounded-lg flex items-center justify-center transition-all"
            >
              팀 만들기
            </Link>
            <Link
              href="/teams"
              className="h-10 px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium rounded-lg flex items-center justify-center transition-all"
            >
              팀 찾기
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// 공통 컴포넌트들
function NextMatchCard({ firstTeam, nextMatch, isManager }: { firstTeam: Team | null; nextMatch: any; isManager: boolean }) {
  return (
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
              <div className="text-[#00e677] font-bold text-lg">
                {formatDateTime(nextMatch.match_date).split(" ")[0]}
              </div>
              <div className="text-white/70 text-sm font-medium">
                {formatDateTime(nextMatch.match_date).split(" ")[1]}
              </div>
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
                      <img
                        src={firstTeam.emblem_url}
                        alt={firstTeam.name}
                        className="w-full h-full rounded-full object-cover"
                      />
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
                  <span className="text-white font-bold tracking-tight">
                    {nextMatch?.opponent_name || "상대팀"}
                  </span>
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
                    ) : isManager ? (
                      "경기를 생성하여 일정을 관리하세요"
                    ) : (
                      "예정된 경기가 없습니다"
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  {nextMatch ? (
                    <Link
                      href={`/matches/${nextMatch.id}`}
                      className="flex-1 md:flex-none h-11 px-6 bg-[#00e677] hover:bg-green-400 text-[#0f2319] text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,230,119,0.3)]"
                    >
                      경기 보기
                    </Link>
                  ) : isManager ? (
                    <Link
                      href={`/teams/${firstTeam.id}/matches/new`}
                      className="flex-1 md:flex-none h-11 px-6 bg-[#00e677] hover:bg-green-400 text-[#0f2319] text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,230,119,0.3)]"
                    >
                      <Calendar className="w-5 h-5" />
                      경기 생성
                    </Link>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 w-full text-center py-8">
              <p className="text-white/60 mb-4">소속된 팀이 없습니다</p>
              <div className="flex gap-3 justify-center">
                <Link
                  href="/teams/new"
                  className="h-11 px-6 bg-[#00e677] hover:bg-green-400 text-[#0f2319] text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  팀 만들기
                </Link>
                <Link
                  href="/teams"
                  className="h-11 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  팀 찾기
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchResultBadge({ result, score }: { result: "승" | "무" | "패"; score: string }) {
  const styles = {
    승: "bg-[#00e677] text-[#0f2319] shadow-[0_0_15px_rgba(0,230,119,0.4)]",
    무: "bg-white/20 text-white backdrop-blur-sm",
    패: "bg-red-500/20 text-red-500 border border-red-500/30 backdrop-blur-sm",
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`size-10 rounded-full flex items-center justify-center font-black text-sm z-10 ${styles[result]}`}
      >
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
  subtext,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  trend?: string;
  subtext?: string;
  suffix?: string;
}) {
  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6 rounded-xl relative overflow-hidden group">
      <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-white">
        {icon}
      </div>
      <p className="text-white/60 text-sm font-medium mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-4xl font-black text-white">
          {value}{suffix && <span className="text-2xl">{suffix}</span>}
        </h3>
        {trend && (
          <span className="text-[#00e677] text-sm font-bold flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" />
            {trend}
          </span>
        )}
      </div>
      {subtext && <p className="text-xs text-white/40 mt-3">{subtext}</p>}
      <div className="w-full bg-white/10 h-1 mt-4 rounded-full overflow-hidden">
        <div
          className="bg-[#00e677] h-full rounded-full shadow-[0_0_10px_#00e677]"
          style={{ width: `${Math.min(suffix === "%" ? value : value * 5, 100)}%` }}
        ></div>
      </div>
    </div>
  );
}

function TeamStatsContent({
  teamDetailedStats: initialStats,
  firstTeam,
  availableYears,
}: {
  teamDetailedStats: TeamDetailedStats | null;
  firstTeam: Team | null;
  availableYears: number[];
}) {
  const currentYear = new Date().getFullYear();
  const availableSeasons = availableYears.length > 0 ? availableYears : [currentYear];
  
  const [selectedSeason, setSelectedSeason] = useState(initialStats?.seasonYear || availableSeasons[0]);
  const [stats, setStats] = useState(initialStats);
  const [isPending, startTransition] = useTransition();
  
  const COLORS = ["#00e677", "#22d3ee", "#f472b6", "#fbbf24", "#a78bfa", "#f97316", "#ec4899", "#14b8a6"];

  const handleSeasonChange = (year: number) => {
    if (!firstTeam || year === selectedSeason) return;
    setSelectedSeason(year);
    startTransition(async () => {
      const newStats = await fetchTeamStatsBySeason(firstTeam.id, year);
      setStats(newStats);
    });
  };

  if (!firstTeam) {
    return (
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-8 rounded-xl text-center">
        <p className="text-white/60 mb-4">소속된 팀이 없습니다</p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/teams/new"
            className="h-10 px-5 bg-[#00e677] hover:bg-green-400 text-[#0f2319] text-sm font-bold rounded-lg flex items-center justify-center transition-all"
          >
            팀 만들기
          </Link>
          <Link
            href="/teams"
            className="h-10 px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium rounded-lg flex items-center justify-center transition-all"
          >
            팀 찾기
          </Link>
        </div>
      </div>
    );
  }

  const {
    goalTypeDistribution = [],
    quarterGoals = [],
    topScorers = [],
    topAssists = [],
    topMom = [],
    topAppearances = [],
    allScorers = [],
    allAssists = [],
    allMom = [],
    allAppearances = [],
    scorerAssistPairs = [],
    goalDistribution = [],
    totalGoals = 0,
  } = stats || {};

  const hasData = totalGoals > 0;

  return (
    <div className={`space-y-6 ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#00e677]" />
          {selectedSeason} 시즌 팀 통계
          {isPending && <span className="text-sm text-white/40 font-normal ml-2">로딩중...</span>}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/40">총 {totalGoals}골</span>
          <select
            value={selectedSeason}
            onChange={(e) => handleSeasonChange(Number(e.target.value))}
            disabled={isPending}
            className="bg-white/5 border border-white/10 text-white text-sm font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#00e677]/50 cursor-pointer hover:bg-white/10 transition-colors appearance-none pr-8 [&>option]:bg-[#0f2319] [&>option]:text-white"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff60'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1rem' }}
          >
            {availableSeasons.map((year) => (
              <option key={year} value={year}>
                {year}시즌
              </option>
            ))}
          </select>
        </div>
      </div>

      {!hasData ? (
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-8 rounded-xl text-center">
          <BarChart3 className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60 mb-2">{selectedSeason}년 통계 데이터가 없습니다</p>
          <p className="text-white/40 text-sm">경기를 완료하면 팀 통계가 표시됩니다</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6 rounded-xl">
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-[#00e677]" />
                골 유형 분포
              </h4>
              {goalTypeDistribution.length > 0 ? (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={goalTypeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="type"
                        label={({ name, percent }) => `${name} ${Math.round((percent || 0) * 100)}%`}
                        labelLine={false}
                      >
                        {goalTypeDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1a2e23",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                      />
                      <Legend
                        wrapperStyle={{ color: "#fff" }}
                        formatter={(value) => <span className="text-white/80 text-xs">{value}</span>}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-white/40 text-sm">
                  데이터 없음
                </div>
              )}
            </div>

            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6 rounded-xl">
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#00e677]" />
                쿼터별 득점
              </h4>
              {quarterGoals.some((q) => q.goals > 0) ? (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={quarterGoals}>
                      <XAxis dataKey="quarter" stroke="#ffffff60" fontSize={12} />
                      <YAxis stroke="#ffffff60" fontSize={12} allowDecimals={false} />
                      <Tooltip
                        cursor={false}
                        isAnimationActive={false}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-[#0f2319] border border-[#00e677]/30 rounded-lg px-3 py-2 shadow-lg shadow-black/50">
                                <p className="text-white font-bold">{payload[0].payload.quarter}</p>
                                <p className="text-[#00e677] font-bold text-lg">{payload[0].value}골</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="goals" fill="#00e677" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-white/40 text-sm">
                  데이터 없음
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RankingBarChart
              title="득점 Top 5"
              icon={<Trophy className="w-4 h-4 text-[#00e677]" />}
              data={topScorers}
              allData={allScorers}
              suffix="골"
              colors={["#fbbf24", "#94a3b8", "#f97316", "#22d3ee", "#ec4899"]}
            />
            <RankingBarChart
              title="어시스트 Top 5"
              icon={<TrendingUp className="w-4 h-4 text-[#22d3ee]" />}
              data={topAssists}
              allData={allAssists}
              suffix="도움"
              colors={["#fbbf24", "#94a3b8", "#f97316", "#a78bfa", "#00e677"]}
            />
            <RankingBarChart
              title="MOM Top 5"
              icon={<Star className="w-4 h-4 text-[#fbbf24]" />}
              data={topMom}
              allData={allMom}
              suffix="회"
              colors={["#fbbf24", "#94a3b8", "#f97316", "#f472b6", "#14b8a6"]}
            />
            <RankingBarChart
              title="출전 Top 5"
              icon={<UserCheck className="w-4 h-4 text-[#a78bfa]" />}
              data={topAppearances}
              allData={allAppearances}
              suffix="경기"
              colors={["#fbbf24", "#94a3b8", "#f97316", "#8b5cf6", "#06b6d4"]}
            />
          </div>

          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6 rounded-xl">
            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Handshake className="w-4 h-4 text-[#00e677]" />
              영혼의 파트너 (득점-도움 조합)
            </h4>
            {scorerAssistPairs.length > 0 ? (
              <div className="space-y-3">
                {scorerAssistPairs.map((pair, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[#00e677] font-bold text-sm w-6">{index + 1}</span>
                      <span className="text-white font-medium">
                        {pair.scorerName} <span className="text-white/40">←</span> {pair.assistName}
                      </span>
                    </div>
                    <span className="text-[#00e677] font-bold">{pair.count}회</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/40 text-sm text-center py-4">데이터 없음</p>
            )}
          </div>

          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6 rounded-xl">
            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#00e677]" />
              득점 분포도
            </h4>
            {goalDistribution.length > 0 ? (
              <GoalDistributionPieChart
                data={goalDistribution.slice(0, 8).map((p) => ({
                  name: p.name,
                  value: p.value,
                  goals: Math.round((p.value / 100) * totalGoals),
                }))}
                colors={COLORS}
              />
            ) : (
              <p className="text-white/40 text-sm text-center py-4">데이터 없음</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function RankingBarChart({
  title,
  icon,
  data,
  allData,
  suffix,
  colors,
}: {
  title: string;
  icon: React.ReactNode;
  data: { memberId: string; name: string; avatarUrl: string | null; value: number }[];
  allData: { memberId: string; name: string; avatarUrl: string | null; value: number }[];
  suffix: string;
  colors: string[];
}) {
  const [showModal, setShowModal] = useState(false);
  
  const chartData = data.map((player, index) => ({
    name: player.name.length > 6 ? player.name.slice(0, 6) + "..." : player.name,
    fullName: player.name,
    value: player.value,
    fill: colors[index % colors.length],
  }));

  return (
    <>
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            {icon}
            {title}
          </h4>
          {allData.length > 5 && (
            <button
              onClick={() => setShowModal(true)}
              className="text-xs text-[#00e677] hover:text-[#00e677]/80 font-medium"
            >
              전체 보기
            </button>
          )}
        </div>
        {data.length > 0 ? (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <XAxis type="number" stroke="#ffffff60" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="#ffffff60" fontSize={11} width={60} />
                <Tooltip
                  cursor={false}
                  isAnimationActive={false}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-[#0f2319] border border-[#00e677]/30 rounded-lg px-3 py-2 shadow-lg shadow-black/50">
                          <p className="text-white font-bold">{item.fullName}</p>
                          <p className="text-[#00e677] font-bold text-lg">{item.value}{suffix}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-white/40 text-sm">
            데이터 없음
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[#0f2319] border border-white/10 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-white font-bold flex items-center gap-2">
                {icon}
                {title} 전체 순위
              </h3>
              <button onClick={() => setShowModal(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-2">
                {allData.map((player, index) => (
                  <div
                    key={player.memberId}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        index === 0
                          ? "bg-[#fbbf24] text-[#0f2319]"
                          : index === 1
                          ? "bg-[#94a3b8] text-[#0f2319]"
                          : index === 2
                          ? "bg-[#f97316] text-white"
                          : "bg-white/10 text-white/60"
                      }`}
                    >
                      {index + 1}
                    </span>
                    {player.avatarUrl ? (
                      <img
                        src={player.avatarUrl}
                        alt={player.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-sm">
                        {player.name.charAt(0)}
                      </div>
                    )}
                    <span className="flex-1 text-white font-medium truncate">{player.name}</span>
                    <span className="text-[#00e677] font-bold">
                      {player.value}
                      <span className="text-white/40 text-xs ml-1">{suffix}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function GoalDistributionPieChart({
  data,
  colors,
}: {
  data: { name: string; value: number; goals: number }[];
  colors: string[];
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const renderLabel = ({ cx, cy, midAngle, outerRadius, name, value, index }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const color = colors[index % colors.length];

    return (
      <text
        x={x}
        y={y}
        fill={color}
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {name} {value}%
      </text>
    );
  };

  return (
    <div className="h-[400px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPie>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={0}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={renderLabel}
            labelLine={{ stroke: "#ffffff40", strokeWidth: 1 }}
            isAnimationActive={false}
            onMouseEnter={(_, index) => setHoverIndex(index)}
            onMouseLeave={() => setHoverIndex(null)}
          >
            {data.map((_, index) => (
              <Cell
                key={`dist-${index}`}
                fill={colors[index % colors.length]}
                cursor="pointer"
                style={{
                  filter: hoverIndex === index ? "brightness(1.2) drop-shadow(0 0 6px " + colors[index % colors.length] + ")" : "none",
                  transition: "all 0.2s ease-out",
                }}
              />
            ))}
          </Pie>
          <Tooltip content={() => null} />
          <Legend
            wrapperStyle={{ color: "#fff" }}
            formatter={(value) => <span className="text-white/80 text-xs">{value}</span>}
          />
        </RechartsPie>
      </ResponsiveContainer>
      {hoverIndex !== null && (
        <div className="absolute top-[42%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none bg-[#0f2319]/90 px-3 py-2 rounded-lg">
          <p className="text-white font-bold text-sm">{data[hoverIndex].name}</p>
          <p className="text-[#00e677] font-bold text-xl">{data[hoverIndex].goals}골</p>
        </div>
      )}
    </div>
  );
}
