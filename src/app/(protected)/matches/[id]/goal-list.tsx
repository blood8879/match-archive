"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { addGoal, deleteGoal } from "@/services/matches";
import { Button } from "@/components/ui/button";
import type { Goal, OpponentPlayer } from "@/types/supabase";
import type { TeamMemberWithUser } from "@/services/teams";

interface GoalListProps {
  goals: Goal[];
  teamMembers: TeamMemberWithUser[];
  opponentPlayers: OpponentPlayer[];
  matchId: string;
  isManager: boolean;
  isFinished: boolean;
  attendingMemberIds: string[];
}

export function GoalList({
  goals,
  teamMembers,
  opponentPlayers,
  matchId,
  isManager,
  isFinished,
  attendingMemberIds,
}: GoalListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [scoringTeam, setScoringTeam] = useState<"HOME" | "AWAY">("HOME");
  const [scorerId, setScorerId] = useState<string>("");
  const [assistId, setAssistId] = useState<string>("");
  const [quarter, setQuarter] = useState(1);
  const [goalType, setGoalType] = useState<
    "NORMAL" | "PK" | "FREEKICK" | "OWN_GOAL"
  >("NORMAL");
  const [isPending, startTransition] = useTransition();

  // 라인업에 있는 멤버만 필터링 (참석한 선수들)
  const lineupMembers = teamMembers.filter((m) =>
    attendingMemberIds.includes(m.id)
  );

  // 출전 중인 상대팀 선수만 필터링
  const playingOpponents = opponentPlayers.filter((p) => p.is_playing);

  const handleAddGoal = () => {
    startTransition(async () => {
      await addGoal(
        matchId,
        scoringTeam,
        scorerId || null,
        assistId || null,
        quarter,
        goalType
      );
      setIsAdding(false);
      setScoringTeam("HOME");
      setScorerId("");
      setAssistId("");
      setQuarter(1);
      setGoalType("NORMAL");
    });
  };

  const handleDelete = (goalId: string) => {
    if (!confirm("이 득점 기록을 삭제하시겠습니까?")) return;

    startTransition(async () => {
      await deleteGoal(goalId, matchId);
    });
  };

  const getMemberName = (memberId: string | null) => {
    if (!memberId) return "알 수 없음";
    const member = teamMembers.find((m) => m.id === memberId);
    return member?.is_guest && member?.guest_name
      ? member.guest_name
      : member?.user?.nickname || "알 수 없음";
  };

  const getPositionBadgeClass = (memberId: string | null) => {
    if (!memberId) return "bg-[#214a36] text-[#8eccae]";
    const member = teamMembers.find((m) => m.id === memberId);
    const position = member?.user?.position;
    switch (position) {
      case "FW":
        return "bg-blue-500/20 text-blue-400";
      case "MF":
        return "bg-green-500/20 text-green-400";
      case "DF":
        return "bg-orange-500/20 text-orange-400";
      case "GK":
        return "bg-yellow-500/20 text-yellow-400";
      default:
        return "bg-[#214a36] text-[#8eccae]";
    }
  };

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {goals.map((goal) => {
          const isHomeGoal = goal.scoring_team === "HOME";
          const scorer = isHomeGoal
            ? teamMembers.find((m) => m.id === goal.team_member_id)
            : opponentPlayers.find((p) => p.id === goal.opponent_player_id);

          const scorerName = isHomeGoal
            ? getMemberName(goal.team_member_id)
            : scorer
            ? (scorer as OpponentPlayer).name
            : "알 수 없음";

          return (
            <li
              key={goal.id}
              className="flex items-center justify-between rounded-lg bg-[#162e23] hover:bg-[#1e3a2c] px-4 py-3 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  isHomeGoal
                    ? getPositionBadgeClass(goal.team_member_id)
                    : "bg-[#214a36] text-[#8eccae]"
                }`}>
                  {goal.type === "OWN_GOAL" ? "OG" : scorerName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">
                      {goal.type === "OWN_GOAL" ? "자책골" : scorerName}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      isHomeGoal
                        ? "bg-[#00e677]/20 text-[#00e677]"
                        : "bg-[#214a36] text-[#8eccae]"
                    }`}>
                      {isHomeGoal ? "HOME" : "AWAY"}
                    </span>
                  </div>
                  {(goal.assist_member_id || goal.assist_opponent_id) && (
                    <span className="text-[#8eccae] text-sm">
                      도움: {goal.assist_member_id
                        ? getMemberName(goal.assist_member_id)
                        : opponentPlayers.find((p) => p.id === goal.assist_opponent_id)?.name || "알 수 없음"
                      }
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#8eccae]">
                <span className="px-2 py-1 rounded bg-[#214a36] text-xs font-medium">
                  Q{goal.quarter}
                </span>
                {goal.type !== "NORMAL" && (
                  <span className="px-2 py-1 rounded bg-[#214a36] text-xs font-medium">
                    {goal.type}
                  </span>
                )}
                {isManager && !isFinished && (
                  <button
                    onClick={() => handleDelete(goal.id)}
                    disabled={isPending}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-500/20 text-red-400 transition-all disabled:opacity-50"
                    title="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {goals.length === 0 && (
          <p className="py-8 text-center text-[#8eccae]">득점 기록이 없습니다</p>
        )}
      </ul>

      {isManager && !isFinished && (
        <>
          {isAdding ? (
            <div className="space-y-4 rounded-xl bg-[#162e23] p-4 border border-[#214a36]">
              {/* 팀 선택 */}
              <div>
                <label className="mb-2 block text-xs font-medium text-[#8eccae]">
                  득점 팀
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setScoringTeam("HOME");
                      setScorerId("");
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      scoringTeam === "HOME"
                        ? "bg-[#00e677] text-[#0f2319]"
                        : "bg-[#0f2319] text-[#8eccae] border border-[#214a36] hover:bg-[#162e23]"
                    }`}
                  >
                    우리 팀 (HOME)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScoringTeam("AWAY");
                      setScorerId("");
                      setAssistId("");
                    }}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      scoringTeam === "AWAY"
                        ? "bg-[#214a36] text-white"
                        : "bg-[#0f2319] text-[#8eccae] border border-[#214a36] hover:bg-[#162e23]"
                    }`}
                  >
                    상대 팀 (AWAY)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#8eccae]">
                    득점자
                  </label>
                  <select
                    value={scorerId}
                    onChange={(e) => setScorerId(e.target.value)}
                    className="w-full rounded-xl bg-[#0f2319] border border-[#214a36] px-4 py-3 text-sm text-white outline-none focus:border-[#00e677] focus:ring-1 focus:ring-[#00e677]"
                  >
                    <option value="">선택</option>
                    {scoringTeam === "HOME"
                      ? lineupMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.is_guest && member.guest_name
                              ? member.guest_name
                              : member.user?.nickname}
                          </option>
                        ))
                      : playingOpponents.map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.name}
                            {player.number && ` (#${player.number})`}
                          </option>
                        ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#8eccae]">
                    도움
                  </label>
                  <select
                    value={assistId}
                    onChange={(e) => setAssistId(e.target.value)}
                    className="w-full rounded-xl bg-[#0f2319] border border-[#214a36] px-4 py-3 text-sm text-white outline-none focus:border-[#00e677] focus:ring-1 focus:ring-[#00e677]"
                  >
                    <option value="">없음</option>
                    {scoringTeam === "HOME"
                      ? lineupMembers
                          .filter((m) => m.id !== scorerId)
                          .map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.is_guest && member.guest_name
                                ? member.guest_name
                                : member.user?.nickname}
                            </option>
                          ))
                      : playingOpponents
                          .filter((p) => p.id !== scorerId)
                          .map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.name}
                              {player.number && ` (#${player.number})`}
                            </option>
                          ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#8eccae]">
                    쿼터
                  </label>
                  <div className="inline-flex bg-[#0f2319] p-1 rounded-xl border border-[#214a36]">
                    {[1, 2, 3, 4].map((q) => (
                      <label key={q} className="cursor-pointer">
                        <input
                          type="radio"
                          name="quarter"
                          value={q}
                          checked={quarter === q}
                          onChange={() => setQuarter(q)}
                          className="sr-only peer"
                        />
                        <div className="px-4 py-2 rounded-lg text-sm font-medium text-[#8eccae] peer-checked:bg-[#00e677] peer-checked:text-[#0f2319] hover:bg-white/5 transition-all">
                          {q}Q
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-[#8eccae]">
                    유형
                  </label>
                  <select
                    value={goalType}
                    onChange={(e) =>
                      setGoalType(
                        e.target.value as
                          | "NORMAL"
                          | "PK"
                          | "FREEKICK"
                          | "OWN_GOAL"
                      )
                    }
                    className="w-full rounded-xl bg-[#0f2319] border border-[#214a36] px-4 py-3 text-sm text-white outline-none focus:border-[#00e677] focus:ring-1 focus:ring-[#00e677]"
                  >
                    <option value="NORMAL">일반</option>
                    <option value="PK">PK</option>
                    <option value="FREEKICK">프리킥</option>
                    <option value="OWN_GOAL">자책골</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 h-11 flex items-center justify-center rounded-xl bg-[#214a36] hover:bg-[#2b5d45] text-white font-medium transition-colors border border-white/5"
                >
                  취소
                </button>
                <Button
                  onClick={handleAddGoal}
                  isLoading={isPending}
                  className="flex-1 h-11 bg-[#00e677] hover:bg-green-400 text-[#0f2319] font-bold rounded-xl"
                >
                  추가
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-[#214a36] hover:bg-[#2b5d45] text-white font-medium transition-colors border border-white/5"
            >
              <Plus className="h-5 w-5" />
              득점 추가
            </button>
          )}
        </>
      )}
    </div>
  );
}
