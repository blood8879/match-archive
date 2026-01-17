import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Target } from "lucide-react";
import {
  getMatchById,
  getMatchRecords,
  getMatchGoals,
} from "@/services/matches";
import { getOpponentPlayers } from "@/services/opponent-players";
import { getTeamById, getTeamMembers } from "@/services/teams";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { ScoreForm } from "../score-form";
import { GoalList } from "../goal-list";
import { FinishMatchButton } from "../finish-match-button";

interface ResultPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResultPage({ params }: ResultPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let match;
  let records;
  let goals;
  let opponentPlayers: any[] = [];

  try {
    match = await getMatchById(id);
    if (!match) notFound();
    records = await getMatchRecords(id);
    goals = await getMatchGoals(id);

    try {
      opponentPlayers = await getOpponentPlayers(id);
    } catch (error) {
      console.log("opponent_players not available yet:", error);
      opponentPlayers = [];
    }
  } catch (error) {
    console.error("Error loading match:", error);
    notFound();
  }

  const team = await getTeamById(match.team_id);
  const teamMembers = await getTeamMembers(match.team_id);

  const currentUserMembership = teamMembers.find((m) => m.user_id === user?.id);
  const isManager =
    currentUserMembership?.role === "OWNER" ||
    currentUserMembership?.role === "MANAGER";

  // 운영진이 아니면 경기 상세 페이지로 리다이렉트
  if (!isManager) {
    notFound();
  }

  const isFinished = match.status === "FINISHED";

  const lineupMemberIds = records.map((r) => r.team_member_id);
  const opponentDisplayName = (match as any).opponent_team?.name || match.opponent_name;

  return (
    <div className="min-h-screen bg-[#0f2319] relative">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#00e677]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#214a36]/20 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-6 lg:px-8 lg:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <Link
            href={`/matches/${match.id}`}
            className="flex items-center gap-2 text-[#8eccae] hover:text-[#00e677] transition-colors text-sm w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>경기 상세로 돌아가기</span>
          </Link>

          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {isFinished ? "경기 결과 수정" : "경기 결과 입력"}
            </h1>
            <p className="text-[#8eccae] text-sm mt-1">
              {formatDateTime(match.match_date)} | {team?.name} vs {opponentDisplayName}
              {isFinished && <span className="ml-2 text-[#00e677]">(완료된 경기)</span>}
            </p>
          </div>
        </div>

        {/* Score Input Section */}
        <section className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-1 bg-[#00e677]/20 rounded-md">
              <Target className="h-4 w-4 text-[#00e677]" />
            </div>
            <h3 className="text-white text-sm font-bold">스코어 입력</h3>
          </div>

          {/* 팀 정보 표시 */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="text-center">
              <div className="size-14 mx-auto rounded-full bg-[#00e677]/10 border-2 border-[#00e677]/30 flex items-center justify-center overflow-hidden mb-2">
                {team?.emblem_url ? (
                  <img
                    src={team.emblem_url}
                    alt={team.name || "Home Team"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-[#00e677]">
                    {team?.name?.charAt(0) || "H"}
                  </span>
                )}
              </div>
              <p className="text-white font-bold text-sm">{team?.name}</p>
              <p className="text-[#8eccae] text-xs">HOME</p>
            </div>

            <span className="text-2xl text-[#8eccae]/50 font-bold">VS</span>

            <div className="text-center">
              <div className="size-14 mx-auto rounded-full bg-[#214a36] border-2 border-[#2f6a4d] flex items-center justify-center overflow-hidden mb-2">
                {(match as any).opponent_team?.emblem_url ? (
                  <img
                    src={(match as any).opponent_team.emblem_url}
                    alt={opponentDisplayName || "Away Team"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-[#8eccae]">
                    {opponentDisplayName?.charAt(0) || "A"}
                  </span>
                )}
              </div>
              <p className="text-white font-bold text-sm">{opponentDisplayName}</p>
              <p className="text-[#8eccae] text-xs">AWAY</p>
            </div>
          </div>

          <ScoreForm
            matchId={match.id}
            homeScore={match.home_score}
            awayScore={match.away_score}
          />
        </section>

        {/* Goal Records Section */}
        <section className="glass-panel rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#214a36] bg-[#162e23]/50 flex items-center gap-2">
            <div className="p-1 bg-[#00e677]/20 rounded-md">
              <Target className="h-4 w-4 text-[#00e677]" />
            </div>
            <h3 className="text-white text-sm font-bold">
              득점 기록 ({goals.length}골)
            </h3>
          </div>
          <div className="p-5">
            <GoalList
              goals={goals}
              teamMembers={teamMembers}
              opponentPlayers={opponentPlayers}
              matchId={match.id}
              isManager={isManager}
              isFinished={isFinished}
              attendingMemberIds={lineupMemberIds}
            />
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href={`/matches/${match.id}`}
            className={`h-12 flex items-center justify-center rounded-xl bg-[#214a36] hover:bg-[#2b5d45] text-white font-medium transition-colors ${isFinished ? "flex-1" : ""}`}
            style={{ flex: isFinished ? 1 : undefined, minWidth: isFinished ? undefined : "120px", paddingLeft: isFinished ? undefined : "24px", paddingRight: isFinished ? undefined : "24px" }}
          >
            돌아가기
          </Link>
          {!isFinished && (match.home_score !== null || match.away_score !== null) && (
            <div className="flex-1">
              <FinishMatchButton matchId={match.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
