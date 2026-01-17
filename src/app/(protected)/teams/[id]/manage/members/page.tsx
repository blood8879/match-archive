import { notFound, redirect } from "next/navigation";
import { getTeamById, getTeamMembers } from "@/services/teams";
import { createClient } from "@/lib/supabase/server";
import { MemberManagementList } from "./member-management-list";
import { CopyCodeButton } from "./copy-code-button";
import { InviteButton } from "./invite-button";
import Link from "next/link";
import { ArrowLeft, Users, Clock, Zap, GitMerge, UserPlus } from "lucide-react";

interface TeamMembersManagePageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamMembersManagePage({
  params,
}: TeamMembersManagePageProps) {
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
  
  const activeUserIds = new Set(activeMembers.map((m) => m.user_id));
  const pendingMembers = members.filter(
    (m) => m.status === "pending" && !activeUserIds.has(m.user_id)
  );
  
  const guestMembers = members.filter((m) => m.is_guest && m.status !== "merged");

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
          <h1 className="text-3xl font-bold text-white">팀원 관리</h1>
          <p className="text-text-muted mt-1">{team.name}</p>
        </div>
      </div>

      <section className="glass-card rounded-2xl p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">팀 초대 코드</h2>
            <p className="text-sm text-text-400">
              이 코드를 공유하여 새로운 팀원을 초대하세요
            </p>
          </div>
          <CopyCodeButton code={team.code} />
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-text-muted text-sm font-medium">전체 팀원</p>
            <Users className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-white">{activeMembers.length}</p>
        </div>

        <div className="glass-card p-5 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-text-muted text-sm font-medium">승인 대기</p>
            <Clock className="w-5 h-5 text-caution" />
          </div>
          <p className="text-3xl font-bold text-white">{pendingMembers.length}</p>
        </div>

        <div className="glass-card p-5 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-text-muted text-sm font-medium">용병</p>
            <Zap className="w-5 h-5 text-accent-500" />
          </div>
          <p className="text-3xl font-bold text-white">{guestMembers.length}</p>
        </div>
      </div>

      {pendingMembers.length > 0 && (
        <section className="bg-[#3d2800]/40 backdrop-blur-xl border border-[#FFC400]/30 rounded-2xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-caution/20 rounded-lg">
                <Clock className="w-6 h-6 text-caution" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">승인 대기 중</h2>
                <p className="text-sm text-text-400 mt-0.5">
                  {pendingMembers.length}명의 가입 신청이 있습니다
                </p>
              </div>
            </div>
          </div>
          <MemberManagementList
            members={pendingMembers}
            teamId={id}
            isOwner={currentUserMembership?.role === "OWNER"}
            showActions
          />
        </section>
      )}

      <section className="glass-card rounded-2xl p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">활성 팀원</h2>
              <p className="text-sm text-text-400 mt-0.5">
                {activeMembers.length}명의 팀원이 활동 중입니다
              </p>
            </div>
          </div>
          <InviteButton teamId={id} />
        </div>
        <MemberManagementList
          members={activeMembers}
          teamId={id}
          isOwner={currentUserMembership?.role === "OWNER"}
        />
      </section>

      <section className="glass-card rounded-2xl p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-500/20 rounded-lg">
              <Zap className="w-6 h-6 text-accent-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">용병</h2>
              <p className="text-sm text-text-400 mt-0.5">
                {guestMembers.length > 0
                  ? `${guestMembers.length}명의 용병이 등록되어 있습니다`
                  : "등록된 용병이 없습니다"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {guestMembers.length > 0 && (
              <Link
                href={`/teams/${id}/manage/merge-records`}
                className="h-10 px-4 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-semibold text-sm transition-all border border-purple-500/30 flex items-center gap-2"
              >
                <GitMerge className="w-4 h-4" />
                기록 병합
              </Link>
            )}
            <Link
              href={`/teams/${id}/guests/new`}
              className="h-10 px-4 rounded-xl bg-accent-500 hover:bg-accent-600 text-black font-semibold text-sm transition-all flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              용병 추가
            </Link>
          </div>
        </div>
        {guestMembers.length > 0 ? (
          <MemberManagementList
            members={guestMembers}
            teamId={id}
            isOwner={currentUserMembership?.role === "OWNER"}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-text-400 text-sm">
              용병을 추가하면 경기 기록에 포함시킬 수 있습니다
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
