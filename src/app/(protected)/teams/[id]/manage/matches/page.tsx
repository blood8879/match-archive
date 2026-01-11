import { notFound, redirect } from "next/navigation";
import { getTeamById, getTeamMembers } from "@/services/teams";
import { getMatchesByTeam } from "@/services/matches";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MatchTabs } from "./match-tabs";

interface MatchManagePageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchManagePage({ params }: MatchManagePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let team;
  let members;
  let matches;

  try {
    team = await getTeamById(id);
    members = await getTeamMembers(id);
    matches = await getMatchesByTeam(id);
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

  const now = new Date();
  const scheduledMatches = matches.filter(
    (m) => m.status === "SCHEDULED" && new Date(m.match_date) >= now
  );
  const finishedMatches = matches.filter((m) => m.status === "FINISHED");
  const allMatches = matches;

  return (
    <main className="relative z-10 flex-1 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm mb-2">
            <Link
              href="/dashboard"
              className="text-gray-400 hover:text-primary transition-colors"
            >
              홈
            </Link>
            <span className="text-gray-600">/</span>
            <Link
              href={`/teams/${id}`}
              className="text-gray-400 hover:text-primary transition-colors"
            >
              {team.name}
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-primary font-medium">경기 관리</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            경기 관리
          </h1>
          <p className="text-gray-400 mt-2">
            팀의 모든 경기를 관리하고 라인업을 설정하세요
          </p>
        </div>
        <Link href={`/teams/${id}/matches/new`}>
          <Button variant="primary" size="lg">
            <Plus className="w-5 h-5 mr-2" />
            새 경기 생성
          </Button>
        </Link>
      </div>

      <MatchTabs
        scheduledMatches={scheduledMatches}
        finishedMatches={finishedMatches}
        allMatches={allMatches}
        teamId={id}
      />
    </main>
  );
}
