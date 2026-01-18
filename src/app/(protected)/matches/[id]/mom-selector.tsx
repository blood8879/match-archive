"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { updateMOM } from "@/services/matches";

interface MOMSelectorProps {
  matchId: string;
  records: Array<{
    id: string;
    team_member_id: string;
    is_mom: boolean;
  }>;
  teamMembers: Array<{
    id: string;
    user?: { nickname?: string | null; avatar_url?: string | null } | null;
    is_guest?: boolean;
    guest_name?: string | null;
  }>;
  isFinished: boolean;
}

export function MOMSelector({ matchId, records, teamMembers, isFinished }: MOMSelectorProps) {
  const currentMOM = records.find((r) => r.is_mom);
  const [selectedMOM, setSelectedMOM] = useState<string | null>(
    currentMOM?.team_member_id || null
  );
  const [isPending, startTransition] = useTransition();

  const handleSelectMOM = (teamMemberId: string) => {
    const newValue = selectedMOM === teamMemberId ? null : teamMemberId;
    setSelectedMOM(newValue);

    startTransition(async () => {
      try {
        await updateMOM(matchId, newValue);
      } catch (error) {
        console.error("Failed to update MOM:", error);
        setSelectedMOM(currentMOM?.team_member_id || null);
      }
    });
  };

  const lineupMembers = records.map((r) => {
    const member = teamMembers.find((m) => m.id === r.team_member_id);
    return {
      teamMemberId: r.team_member_id,
      name: member?.is_guest && member?.guest_name
        ? member.guest_name
        : member?.user?.nickname || "알 수 없음",
      avatarUrl: member?.user?.avatar_url || null,
    };
  });

  if (lineupMembers.length === 0) {
    return (
      <div className="text-center py-6 text-[#8eccae] text-sm">
        라인업에 선수가 없습니다. 먼저 참석 선수를 등록해주세요.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[#8eccae] text-xs mb-3">
        {isFinished ? "MOM을 변경하려면 선수를 클릭하세요" : "이 경기의 MVP를 선택하세요 (선택사항)"}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {lineupMembers.map((member) => {
          const isSelected = selectedMOM === member.teamMemberId;
          return (
            <button
              key={member.teamMemberId}
              onClick={() => handleSelectMOM(member.teamMemberId)}
              disabled={isPending}
              className={`flex items-center gap-2 p-3 rounded-xl transition-all ${
                isSelected
                  ? "bg-amber-500/20 border-2 border-amber-500 shadow-lg shadow-amber-500/20"
                  : "bg-[#162e23] border border-[#214a36] hover:border-[#2f6a4d]"
              } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  className="size-8 rounded-full object-cover"
                />
              ) : (
                <div className="size-8 rounded-full bg-[#214a36] flex items-center justify-center text-[#8eccae] text-xs font-bold">
                  {member.name.charAt(0)}
                </div>
              )}
              <span className={`text-sm font-medium truncate ${isSelected ? "text-amber-400" : "text-white"}`}>
                {member.name}
              </span>
              {isSelected && (
                <Star className="w-4 h-4 text-amber-400 fill-amber-400 ml-auto flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
      {selectedMOM && (
        <p className="text-amber-400 text-xs text-center mt-2">
          <Star className="w-3 h-3 inline mr-1 fill-amber-400" />
          MOM 선정됨
        </p>
      )}
    </div>
  );
}
