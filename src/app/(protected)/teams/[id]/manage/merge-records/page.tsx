import { notFound, redirect } from "next/navigation";
import { getTeamById } from "@/services/teams";
import { createClient } from "@/lib/supabase/server";
import {
  getTeamGuestMembers,
  getTeamMergeRequests,
} from "@/services/record-merge";
import Link from "next/link";
import { ArrowLeft, GitMerge, Zap, Clock } from "lucide-react";
import { GuestMembersList } from "./guest-members-list";
import { PendingMergeRequestsList } from "./pending-merge-requests-list";

interface MergeRecordsPageProps {
  params: Promise<{ id: string }>;
}

export default async function MergeRecordsPage({
  params,
}: MergeRecordsPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  let team;
  let guestMembers;
  let pendingRequests;

  try {
    team = await getTeamById(id);

    // 권한 확인
    const { data: myMembership } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!myMembership || !["OWNER", "MANAGER"].includes(myMembership.role)) {
      redirect(`/teams/${id}`);
    }

    guestMembers = await getTeamGuestMembers(id);
    pendingRequests = await getTeamMergeRequests(id);
  } catch {
    notFound();
  }

  if (!team) {
    notFound();
  }

  // 기록이 있는 용병만 필터링
  const guestsWithRecords = guestMembers.filter((g) => g.total_matches > 0);

  return (
    <main className="relative z-10 flex-1 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/teams/${id}/manage/members`}
          className="flex items-center justify-center size-10 rounded-xl bg-surface-700 hover:bg-surface-dark-hover text-white transition-colors border border-white/5"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">기록 병합</h1>
          <p className="text-text-muted mt-1">{team.name}</p>
        </div>
      </div>

      {/* 설명 카드 */}
      <section className="glass-card rounded-2xl p-6 md:p-8 border-l-4 border-purple-500">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-500/20 rounded-xl">
            <GitMerge className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white mb-2">기록 병합이란?</h2>
            <p className="text-text-400 text-sm leading-relaxed">
              용병으로 뛴 선수가 나중에 정규 팀원으로 가입하면, 이전 용병 기록을 해당 팀원의 기록으로 통합할 수 있습니다.
              <br />
              대상 선수의 <span className="text-purple-400 font-semibold">유저 코드</span>를 입력하면 병합 요청이 전송되고,
              선수가 수락하면 자동으로 팀에 가입되며 기록이 통합됩니다.
            </p>
          </div>
        </div>
      </section>

      {/* 대기 중인 병합 요청 */}
      {pendingRequests.length > 0 && (
        <section className="bg-[#3d2800]/40 backdrop-blur-xl border border-[#FFC400]/30 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-caution/20 rounded-lg">
              <Clock className="w-6 h-6 text-caution" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">대기 중인 요청</h2>
              <p className="text-sm text-text-400 mt-0.5">
                {pendingRequests.length}건의 병합 요청이 대기 중입니다
              </p>
            </div>
          </div>
          <PendingMergeRequestsList requests={pendingRequests} teamId={id} />
        </section>
      )}

      {/* 병합 가능한 용병 목록 */}
      <section className="glass-card rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent-500/20 rounded-lg">
            <Zap className="w-6 h-6 text-accent-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">병합 가능한 용병</h2>
            <p className="text-sm text-text-400 mt-0.5">
              {guestsWithRecords.length}명의 용병이 경기 기록을 보유하고 있습니다
            </p>
          </div>
        </div>

        {guestsWithRecords.length > 0 ? (
          <GuestMembersList guests={guestsWithRecords} teamId={id} />
        ) : (
          <div className="text-center py-12">
            <Zap className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <p className="text-text-400">경기 기록이 있는 용병이 없습니다</p>
            <p className="text-text-muted text-sm mt-1">
              용병이 경기에 참여하면 여기에 표시됩니다
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
