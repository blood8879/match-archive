import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getTeamById, getTeamMembers } from "@/services/teams";
import { TeamSettingsForm } from "./team-settings-form";
import type { Team } from "@/types/supabase";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface TeamSettingsPageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamSettingsPage({
  params,
}: TeamSettingsPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let team: Team | null;
  try {
    team = await getTeamById(id);
    if (!team) {
      notFound();
    }
  } catch (error) {
    console.error("Failed to fetch team:", error);
    notFound();
  }

  // 권한 확인
  const teamMembers = await getTeamMembers(id);
  const currentUserMembership = teamMembers.find((m) => m.user_id === user.id);

  const isOwner = currentUserMembership?.role === "OWNER";
  const isAuthorized = isOwner || currentUserMembership?.role === "MANAGER";

  if (!isAuthorized) {
    redirect(`/teams/${id}`);
  }

  const activeMembers = teamMembers.filter(
    (m) => m.status === "active" && m.user_id !== user.id && !m.is_guest
  );

  return (
    <div className="relative min-h-screen">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#00e677]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#214a36]/20 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href={`/teams/${id}`}
            className="flex items-center gap-2 text-[#8eccae] hover:text-[#00e677] transition-colors text-sm w-fit mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>팀으로 돌아가기</span>
          </Link>
          <h1 className="text-3xl font-black text-white mb-2">팀 설정</h1>
          <p className="text-white/60">팀 정보와 설정을 관리하세요.</p>
        </div>

        <TeamSettingsForm 
          team={team} 
          isOwner={isOwner}
          members={activeMembers}
        />
      </div>
    </div>
  );
}
