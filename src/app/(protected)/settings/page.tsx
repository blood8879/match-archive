import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";
import type { User, Team, TeamMember } from "@/types/supabase";

type TeamMemberWithTeam = TeamMember & { team: Team | null };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: myTeamsRaw }] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).single(),
    supabase
      .from("team_members")
      .select("*, team:teams(*)")
      .eq("user_id", user.id)
      .eq("status", "active"),
  ]);

  const typedProfile = profile as User | null;
  const myTeams = myTeamsRaw as TeamMemberWithTeam[] | null;

  // 팀 목록 추출
  const teamList =
    myTeams
      ?.map((m) => ({
        id: m.team?.id || "",
        name: m.team?.name || "",
        emblem_url: m.team?.emblem_url || null,
      }))
      .filter((t) => t.id) || [];

  if (!typedProfile) {
    redirect("/login");
  }

  return (
    <div className="relative min-h-screen">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#00e677]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#214a36]/20 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-1 sm:mb-2">설정</h1>
          <p className="text-white/60 text-sm sm:text-base">계정 정보와 개인 설정을 관리하세요.</p>
        </div>

        <SettingsForm user={typedProfile} teams={teamList} />
      </div>
    </div>
  );
}
