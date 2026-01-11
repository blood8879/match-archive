"use client";

import { useState, useTransition } from "react";
import { saveLineup } from "@/services/matches";
import { Save } from "lucide-react";
import type { TeamMemberWithUser } from "@/services/teams";

interface LineupSelectorProps {
  matchId: string;
  teamMembers: TeamMemberWithUser[];
  selectedIds: string[];
  attendingMemberIds: string[];
}

export function LineupSelector({
  matchId,
  teamMembers,
  selectedIds: initialIds,
  attendingMemberIds,
}: LineupSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);
  const [isPending, startTransition] = useTransition();

  const activeMembers = teamMembers.filter((m) => m.status === "active");

  // Sort members: attending members first, then others
  const sortedMembers = [...activeMembers].sort((a, b) => {
    const aAttending = attendingMemberIds.includes(a.id);
    const bAttending = attendingMemberIds.includes(b.id);
    if (aAttending && !bAttending) return -1;
    if (!aAttending && bAttending) return 1;
    return 0;
  });

  const toggleMember = (memberId: string) => {
    setSelectedIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSave = () => {
    startTransition(async () => {
      await saveLineup(matchId, selectedIds);
    });
  };

  const hasChanges =
    JSON.stringify([...selectedIds].sort()) !==
    JSON.stringify([...initialIds].sort());

  const getPositionBadgeClass = (position: string | null | undefined) => {
    switch (position) {
      case "FW":
        return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
      case "MF":
        return "bg-green-500/20 text-green-400 border border-green-500/30";
      case "DF":
        return "bg-orange-500/20 text-orange-400 border border-orange-500/30";
      case "GK":
        return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
      default:
        return "bg-[#214a36] text-[#8eccae]";
    }
  };

  return (
    <div className="space-y-3">
      <ul className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {sortedMembers.map((member) => {
          const displayName =
            member.is_guest && member.guest_name
              ? member.guest_name
              : member.user?.nickname || "알 수 없음";
          const isSelected = selectedIds.includes(member.id);
          const isAttending = attendingMemberIds.includes(member.id);
          const position = member.user?.position;

          return (
            <li key={member.id}>
              <label className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#162e23] transition-colors cursor-pointer group rounded-lg">
                {/* Avatar & Name */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  {member.user?.avatar_url ? (
                    <img
                      src={member.user.avatar_url}
                      alt={displayName}
                      className="size-9 rounded-full object-cover border border-white/10 flex-shrink-0"
                    />
                  ) : (
                    <div className="size-9 rounded-full bg-[#214a36] flex items-center justify-center border border-white/10 flex-shrink-0">
                      <span className="text-[#8eccae] font-bold text-sm">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span
                      className={`font-medium text-sm truncate transition-colors ${
                        isSelected
                          ? "text-white"
                          : "text-gray-400 group-hover:text-white"
                      }`}
                    >
                      {displayName}
                    </span>
                    {member.role === "OWNER" && (
                      <span className="text-[#8eccae] text-xs">주장</span>
                    )}
                  </div>
                </div>

                {/* Position Badge */}
                <div className="flex items-center gap-2">
                  {position && (
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${getPositionBadgeClass(
                        position
                      )}`}
                    >
                      {position}
                    </span>
                  )}
                  {isAttending && (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#00e677]/20 text-[#00e677] border border-[#00e677]/30">
                      참석
                    </span>
                  )}
                </div>

                {/* Toggle Switch */}
                <div className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isSelected}
                    onChange={() => toggleMember(member.id)}
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00e677]" />
                </div>
              </label>
            </li>
          );
        })}
      </ul>

      {hasChanges && (
        <div className="pt-2 border-t border-[#214a36]">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="w-full h-10 rounded-lg bg-[#00e677] hover:bg-green-400 text-[#0f2319] font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isPending ? "저장중..." : "라인업 저장"}
          </button>
        </div>
      )}
    </div>
  );
}
