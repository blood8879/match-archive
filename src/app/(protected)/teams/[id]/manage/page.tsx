import { notFound, redirect } from "next/navigation";
import { getTeamById, getTeamMembers } from "@/services/teams";
import { getTeamVenues } from "@/services/venues";
import { getMatchesByTeam } from "@/services/matches";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { MapPin, Users, Calendar, Settings } from "lucide-react";

interface ManagePageProps {
  params: Promise<{ id: string }>;
}

export default async function ManagePage({ params }: ManagePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  let team;
  let members;
  let venues;
  let matches;

  try {
    [team, members, venues, matches] = await Promise.all([
      getTeamById(id),
      getTeamMembers(id),
      getTeamVenues(id),
      getMatchesByTeam(id),
    ]);
  } catch {
    notFound();
  }

  if (!team) {
    notFound();
  }

  // Check if user is manager or owner
  const currentUserMembership = members.find((m) => m.user_id === user.id);
  const isManager =
    currentUserMembership?.role === "OWNER" ||
    currentUserMembership?.role === "MANAGER";

  if (!isManager) {
    redirect(`/teams/${id}`);
  }

  const activeMembers = members.filter(
    (m) => m.status === "active" && !m.is_guest
  );
  const pendingMembers = members.filter((m) => m.status === "pending");

  const managementSections = [
    {
      title: "경기장 관리",
      description: "팀의 홈구장과 경기장을 관리합니다",
      icon: MapPin,
      href: `/teams/${id}/venues`,
      stat: `${venues.length}개`,
      statLabel: "등록된 경기장",
      color: "from-blue-500/20 to-transparent",
      borderColor: "border-blue-500/20",
      iconColor: "text-blue-400",
    },
    {
      title: "팀원 관리",
      description: "팀원 승인 및 역할을 관리합니다",
      icon: Users,
      href: `/teams/${id}/manage/members`,
      stat: `${activeMembers.length}명`,
      statLabel: "활성 팀원",
      badge: pendingMembers.length > 0 ? `${pendingMembers.length}명 대기중` : null,
      color: "from-[#00e677]/20 to-transparent",
      borderColor: "border-[#00e677]/20",
      iconColor: "text-[#00e677]",
    },
    {
      title: "경기 관리",
      description: "예정된 경기와 과거 기록을 관리합니다",
      icon: Calendar,
      href: `/teams/${id}/manage/matches`,
      stat: `${matches.length}경기`,
      statLabel: "총 경기 수",
      color: "from-purple-500/20 to-transparent",
      borderColor: "border-purple-500/20",
      iconColor: "text-purple-400",
    },
    {
      title: "팀 설정",
      description: "팀 정보, 엠블럼, 초대코드 등을 설정합니다",
      icon: Settings,
      href: `/teams/${id}/settings`,
      stat: team.code,
      statLabel: "초대 코드",
      color: "from-orange-500/20 to-transparent",
      borderColor: "border-orange-500/20",
      iconColor: "text-orange-400",
    },
  ];

  return (
    <main className="relative z-10 flex-1 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
      {/* Header */}
      <section className="glass-card rounded-2xl p-6 md:p-8 shadow-lg">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
                관리 허브
              </h1>
              <p className="text-[#8eccae] text-base">
                {team.name} 팀의 모든 것을 관리하세요
              </p>
            </div>
            <Link
              href={`/teams/${id}`}
              className="h-10 px-6 rounded-xl bg-[#214a36] hover:bg-[#2b5d45] text-white font-medium text-sm transition-all border border-white/5 flex items-center justify-center"
            >
              팀 페이지로
            </Link>
          </div>
        </div>
      </section>

      {/* Management Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {managementSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.title}
              href={section.href}
              className="group glass-card rounded-2xl p-6 md:p-8 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] border border-white/5 hover:border-white/10 relative overflow-hidden"
            >
              {/* Background Gradient */}
              <div
                className={`absolute right-0 top-0 w-64 h-64 bg-gradient-to-br ${section.color} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              />

              {/* Content */}
              <div className="relative z-10">
                {/* Icon and Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`p-4 rounded-2xl bg-gradient-to-br ${section.color} border ${section.borderColor}`}
                  >
                    <Icon className={`w-8 h-8 ${section.iconColor}`} />
                  </div>
                  {section.badge && (
                    <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold border border-yellow-500/30">
                      {section.badge}
                    </span>
                  )}
                </div>

                {/* Title and Description */}
                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
                  {section.title}
                </h3>
                <p className="text-gray-400 text-sm mb-6">
                  {section.description}
                </p>

                {/* Stats */}
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold text-white mb-1">
                      {section.stat}
                    </p>
                    <p className="text-xs text-[#8eccae] font-medium">
                      {section.statLabel}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-white text-xl">
                      arrow_forward
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      {/* Quick Actions */}
      <section className="glass-card rounded-2xl p-6 md:p-8">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-6 bg-[#00e677] rounded-full"></span>
          빠른 작업
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href={`/teams/${id}/venues`}
            className="p-4 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 hover:bg-black/30 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">경기장 추가</p>
                <p className="text-gray-400 text-xs">새로운 경기장 등록</p>
              </div>
            </div>
          </Link>

          <Link
            href={`/teams/${id}/manage/members`}
            className="p-4 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 hover:bg-black/30 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#00e677]/10 text-[#00e677] group-hover:bg-[#00e677]/20 transition-colors">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">팀원 승인</p>
                <p className="text-gray-400 text-xs">
                  {pendingMembers.length > 0
                    ? `${pendingMembers.length}명 대기중`
                    : "대기중인 요청 없음"}
                </p>
              </div>
            </div>
          </Link>

          <Link
            href={`/teams/${id}/matches/new`}
            className="p-4 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 hover:bg-black/30 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">경기 생성</p>
                <p className="text-gray-400 text-xs">새로운 경기 일정 등록</p>
              </div>
            </div>
          </Link>

          <Link
            href={`/teams/${id}/settings`}
            className="p-4 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 hover:bg-black/30 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 group-hover:bg-orange-500/20 transition-colors">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">팀 설정</p>
                <p className="text-gray-400 text-xs">팀 정보 수정</p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Team Overview */}
      <section className="glass-card rounded-2xl p-6 md:p-8">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-6 bg-[#00e677] rounded-full"></span>
          팀 현황
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-black/20 border border-white/5">
            <p className="text-[#8eccae] text-xs font-medium mb-1">총 팀원</p>
            <p className="text-white text-2xl font-bold">
              {activeMembers.length}명
            </p>
          </div>
          <div className="p-4 rounded-xl bg-black/20 border border-white/5">
            <p className="text-[#8eccae] text-xs font-medium mb-1">승인 대기</p>
            <p className="text-white text-2xl font-bold">
              {pendingMembers.length}명
            </p>
          </div>
          <div className="p-4 rounded-xl bg-black/20 border border-white/5">
            <p className="text-[#8eccae] text-xs font-medium mb-1">
              등록 경기장
            </p>
            <p className="text-white text-2xl font-bold">{venues.length}개</p>
          </div>
          <div className="p-4 rounded-xl bg-black/20 border border-white/5">
            <p className="text-[#8eccae] text-xs font-medium mb-1">총 경기</p>
            <p className="text-white text-2xl font-bold">{matches.length}경기</p>
          </div>
        </div>
      </section>
    </main>
  );
}
