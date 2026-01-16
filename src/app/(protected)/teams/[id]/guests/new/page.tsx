import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { getTeamById, getTeamMembers } from "@/services/teams";
import { createClient } from "@/lib/supabase/server";
import { AddGuestForm } from "./add-guest-form";

interface AddGuestPageProps {
  params: Promise<{ id: string }>;
}

export default async function AddGuestPage({ params }: AddGuestPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const team = await getTeamById(id);
  if (!team) {
    notFound();
  }

  const members = await getTeamMembers(id);
  const currentUserMembership = members.find((m) => m.user_id === user.id);

  // 매니저 권한 확인
  const isManager =
    currentUserMembership?.role === "OWNER" ||
    currentUserMembership?.role === "MANAGER";

  if (!isManager) {
    redirect(`/teams/${id}`);
  }

  return (
    <main className="min-h-screen bg-surface-900 relative">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-accent-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-surface-700/20 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-6 lg:px-8 lg:py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/teams/${id}/manage/members`}
            className="flex items-center gap-2 text-text-400 hover:text-accent-500 transition-colors text-sm mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>멤버 관리로 돌아가기</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <UserPlus className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">용병 추가</h1>
              <p className="text-sm text-text-400 mt-0.5">
                {team.name} 팀에 용병을 추가합니다
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="glass-card rounded-2xl p-6 md:p-8">
          <AddGuestForm teamId={id} />
        </div>
      </div>
    </main>
  );
}
