import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";
import type { User } from "@/types/supabase";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const typedProfile = profile as User | null;

  if (!typedProfile) {
    redirect("/login");
  }

  return (
    <div className="relative min-h-screen">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#00e677]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#214a36]/20 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">설정</h1>
          <p className="text-white/60">계정 정보와 개인 설정을 관리하세요.</p>
        </div>

        <SettingsForm user={typedProfile} />
      </div>
    </div>
  );
}
