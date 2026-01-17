import { notFound, redirect } from "next/navigation";
import { getTeamById, getTeamMembers } from "@/services/teams";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, Users, Shield, Swords, Target, Goal } from "lucide-react";

interface TeamSquadPageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamSquadPage({ params }: TeamSquadPageProps) {
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

  try {
    team = await getTeamById(id);
    members = await getTeamMembers(id);
  } catch {
    notFound();
  }

  if (!team) {
    notFound();
  }

  const activeMembers = members.filter(
    (m) => m.status === "active" && !m.is_guest
  );

  // 포지션별 그룹핑
  const gkMembers = activeMembers.filter((m) =>
    m.team_positions?.includes("GK") || m.user?.position === "GK"
  );
  const dfMembers = activeMembers.filter((m) =>
    m.team_positions?.some((p) => ["CB", "LB", "RB", "SW", "DF"].includes(p)) ||
    ["CB", "LB", "RB", "SW", "DF"].includes(m.user?.position || "")
  );
  const mfMembers = activeMembers.filter((m) =>
    m.team_positions?.some((p) => ["CM", "CDM", "CAM", "LM", "RM", "MF"].includes(p)) ||
    ["CM", "CDM", "CAM", "LM", "RM", "MF"].includes(m.user?.position || "")
  );
  const fwMembers = activeMembers.filter((m) =>
    m.team_positions?.some((p) => ["CF", "ST", "LW", "RW", "FW"].includes(p)) ||
    ["CF", "ST", "LW", "RW", "FW"].includes(m.user?.position || "")
  );
  // 포지션 미지정 선수들
  const unassigned = activeMembers.filter((m) => {
    const hasPosition = gkMembers.includes(m) || dfMembers.includes(m) || mfMembers.includes(m) || fwMembers.includes(m);
    return !hasPosition;
  });

  const PositionSection = ({
    title,
    icon: Icon,
    members,
    color
  }: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    members: typeof activeMembers;
    color: string;
  }) => (
    members.length > 0 && (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${color}`} />
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <span className="text-sm text-gray-400">({members.length})</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {members.map((member) => (
            <Link
              key={member.id}
              href={`/players/${member.id}`}
              className="p-4 rounded-xl bg-surface-700/50 border border-white/5 hover:border-primary/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                {member.user?.avatar_url ? (
                  <img
                    src={member.user.avatar_url}
                    alt={member.user?.nickname || "Unknown"}
                    className="size-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="size-10 rounded-full bg-[#214a36] flex items-center justify-center text-primary font-bold">
                    {member.back_number || member.user?.nickname?.charAt(0) || "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate group-hover:text-primary transition-colors">
                    {member.user?.nickname || "Unknown"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {member.back_number ? `#${member.back_number}` : ""} {member.team_positions?.[0] || member.user?.position || ""}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    )
  );

  return (
    <main className="relative z-10 flex-1 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/teams/${id}`}
          className="flex items-center justify-center size-10 rounded-xl bg-surface-700 hover:bg-surface-dark-hover text-white transition-colors border border-white/5"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">스쿼드</h1>
          <p className="text-text-muted mt-1">{team.name} · {activeMembers.length}명</p>
        </div>
      </div>

      <section className="glass-card rounded-2xl p-6 md:p-8 space-y-8">
        <PositionSection
          title="골키퍼"
          icon={Goal}
          members={gkMembers}
          color="text-yellow-400"
        />
        <PositionSection
          title="수비수"
          icon={Shield}
          members={dfMembers}
          color="text-blue-400"
        />
        <PositionSection
          title="미드필더"
          icon={Swords}
          members={mfMembers}
          color="text-green-400"
        />
        <PositionSection
          title="공격수"
          icon={Target}
          members={fwMembers}
          color="text-red-400"
        />
        <PositionSection
          title="미지정"
          icon={Users}
          members={unassigned}
          color="text-gray-400"
        />

        {activeMembers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">등록된 팀원이 없습니다</p>
          </div>
        )}
      </section>
    </main>
  );
}
