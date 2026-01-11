import { notFound, redirect } from "next/navigation";
import { getTeamById } from "@/services/teams";
import { createClient } from "@/lib/supabase/server";
import { getMyUserCode, getTeamInvites } from "@/services/invites";
import { InviteForm } from "./invite-form";
import { PendingInvitesList } from "./pending-invites-list";
import Link from "next/link";
import { ArrowLeft, Users, Mail } from "lucide-react";

interface TeamInvitePageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamInvitePage({ params }: TeamInvitePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  let team;
  try {
    team = await getTeamById(id);
  } catch {
    notFound();
  }

  if (!team) {
    notFound();
  }

  // 권한 확인 - OWNER 또는 MANAGER만 접근 가능
  const { data: membership } = await supabase
    .from("team_members")
    .select("role, status")
    .eq("team_id", id)
    .eq("user_id", user.id)
    .single();

  if (
    !membership ||
    membership.status !== "active" ||
    (membership.role !== "OWNER" && membership.role !== "MANAGER")
  ) {
    redirect(`/teams/${id}`);
  }

  const myUserCode = await getMyUserCode();
  const pendingInvites = await getTeamInvites(id);

  return (
    <main className="relative z-10 flex-1 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/teams/${id}/manage/members`}
          className="flex items-center justify-center size-10 rounded-xl bg-surface-700 hover:bg-surface-dark-hover text-white transition-colors border border-white/5"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">팀원 초대</h1>
          <p className="text-text-muted mt-1">{team.name}</p>
        </div>
      </div>

      {/* 내 유저 코드 */}
      <section className="glass-card rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">내 유저 코드</h2>
            <p className="text-sm text-text-400 mt-0.5">
              다른 사람에게 내 유저 코드를 알려주면 초대를 받을 수 있습니다
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-[#214a36] px-6 py-4 rounded-xl border border-[#00e677]/20">
          <span className="text-3xl font-mono font-bold text-[#00e677] tracking-wider">
            {myUserCode || "코드 없음"}
          </span>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(myUserCode || "");
            }}
            className="ml-auto p-2 hover:bg-[#00e677]/10 rounded-lg transition-colors"
            title="코드 복사"
          >
            복사
          </button>
        </div>
      </section>

      {/* 초대 폼 */}
      <section className="glass-card rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent-500/20 rounded-lg">
            <Mail className="w-6 h-6 text-accent-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">유저 코드로 초대</h2>
            <p className="text-sm text-text-400 mt-0.5">
              초대할 사용자의 유저 코드를 입력하세요
            </p>
          </div>
        </div>
        <InviteForm teamId={id} />
      </section>

      {/* 대기 중인 초대 목록 */}
      {pendingInvites.length > 0 && (
        <section className="glass-card rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-caution/20 rounded-lg">
              <Mail className="w-6 h-6 text-caution" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                대기 중인 초대 ({pendingInvites.length})
              </h2>
              <p className="text-sm text-text-400 mt-0.5">
                상대방이 수락하면 팀에 자동으로 가입됩니다
              </p>
            </div>
          </div>
          <PendingInvitesList invites={pendingInvites} />
        </section>
      )}
    </main>
  );
}
