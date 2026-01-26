import { notFound, redirect } from "next/navigation";
import { getTeamById } from "@/services/teams";
import { getTeamMergeRequests } from "@/services/team-merge";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, GitMerge, Link2 } from "lucide-react";
import { TeamSearchForm } from "./team-search-form";
import { IncomingRequests } from "./incoming-requests";
import { OutgoingRequests } from "./outgoing-requests";

interface MergeTeamsPageProps {
  params: Promise<{ id: string }>;
}

export default async function MergeTeamsPage({ params }: MergeTeamsPageProps) {
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

  const incomingRequests = await getTeamMergeRequests(id, "incoming");
  const outgoingRequests = await getTeamMergeRequests(id, "outgoing");

  const pendingIncoming = incomingRequests.filter(
    (r) => r.status === "pending" || r.status === "dispute"
  );
  const pendingOutgoing = outgoingRequests.filter(
    (r) => r.status === "pending" || r.status === "dispute"
  );

  return (
    <div className="relative min-h-screen">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#00e677]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#214a36]/20 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <Link
            href={`/teams/${id}`}
            className="flex items-center gap-2 text-[#8eccae] hover:text-[#00e677] transition-colors text-sm w-fit mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>팀으로 돌아가기</span>
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Link2 className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              팀 기록 통합
            </h1>
          </div>
          <p className="text-white/60 text-sm sm:text-base">
            다른 팀과의 과거 경기 기록을 통합합니다.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-6 mb-6 border-l-4 border-purple-500">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-purple-500/20 rounded-xl shrink-0">
              <GitMerge className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white mb-2">
                팀 기록 통합이란?
              </h2>
              <p className="text-text-400 text-xs sm:text-sm leading-relaxed">
                게스트팀으로 기록했던 상대팀이 서비스에 가입하면, 기존 경기 기록을
                해당 팀과 연결할 수 있습니다.
                <br />
                상대 팀의{" "}
                <span className="text-purple-400 font-semibold">팀 코드</span>를
                입력하면 관련 경기를 찾아 통합 요청을 보낼 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        <TeamSearchForm teamId={id} teamName={team.name} />

        {pendingIncoming.length > 0 && (
          <IncomingRequests requests={pendingIncoming} />
        )}

        {pendingOutgoing.length > 0 && (
          <OutgoingRequests requests={pendingOutgoing} />
        )}
      </div>
    </div>
  );
}
