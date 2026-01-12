import { notFound, redirect } from "next/navigation";
import { getTeamById, getTeamMembers } from "@/services/teams";
import { getGuestTeams } from "@/services/guest-teams";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, Users, Shield } from "lucide-react";
import { GuestTeamList } from "./guest-team-list";

interface GuestTeamsPageProps {
  params: Promise<{ id: string }>;
}

export default async function GuestTeamsPage({ params }: GuestTeamsPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let team;
  let guestTeams;

  try {
    team = await getTeamById(id);
    if (!team) {
      notFound();
    }

    const teamMembers = await getTeamMembers(id);
    const currentUserMembership = teamMembers.find((m) => m.user_id === user.id);

    const isAuthorized =
      currentUserMembership?.role === "OWNER" ||
      currentUserMembership?.role === "MANAGER";

    if (!isAuthorized) {
      redirect(`/teams/${id}`);
    }

    guestTeams = await getGuestTeams(id);
  } catch (error) {
    console.error("Failed to load guest teams:", error);
    notFound();
  }

  return (
    <div className="relative min-h-screen">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#00e677]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#214a36]/20 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href={`/teams/${id}`}
            className="flex items-center gap-2 text-[#8eccae] hover:text-[#00e677] transition-colors text-sm w-fit mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>팀으로 돌아가기</span>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#00e677]/20 rounded-lg">
              <Users className="h-6 w-6 text-[#00e677]" />
            </div>
            <h1 className="text-3xl font-black text-white">게스트팀 관리</h1>
          </div>
          <p className="text-white/60">
            시스템에 등록되지 않은 상대팀을 게스트팀으로 관리하세요.
          </p>
        </div>

        <GuestTeamList teamId={id} initialGuestTeams={guestTeams} />

        <div className="mt-8 glass-panel rounded-2xl p-6 bg-[#214a36]/20">
          <div className="flex items-start gap-4">
            <Shield className="h-5 w-5 text-[#00e677] mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-white font-semibold mb-2">게스트팀이란?</h3>
              <ul className="text-sm text-white/70 space-y-1">
                <li>• 시스템에 등록되지 않은 외부 팀과의 경기 기록을 위한 기능입니다</li>
                <li>• 팀 이름, 지역, 엠블럼 등을 저장하여 재사용할 수 있습니다</li>
                <li>• 매치 생성 시 게스트팀을 선택하거나 즉시 추가할 수 있습니다</li>
                <li>• 게스트팀은 팀별로 독립적으로 관리됩니다</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
