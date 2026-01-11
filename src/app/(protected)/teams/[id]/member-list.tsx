"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { approveMember, rejectMember } from "@/services/teams";
import type { TeamMemberWithUser } from "@/services/teams";

interface MemberListProps {
  members: TeamMemberWithUser[];
  isManager: boolean;
  showActions?: boolean;
  enableClick?: boolean;
}

export function MemberList({
  members,
  isManager,
  showActions = false,
  enableClick = true,
}: MemberListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const handleApprove = async (memberId: string) => {
    setLoadingId(memberId);
    try {
      await approveMember(memberId);
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (memberId: string) => {
    setLoadingId(memberId);
    try {
      await rejectMember(memberId);
    } finally {
      setLoadingId(null);
    }
  };

  const handleMemberClick = (memberId: string) => {
    if (enableClick && !showActions) {
      router.push(`/players/${memberId}`);
    }
  };

  if (members.length === 0) {
    return <p className="py-4 text-center text-text-400">멤버가 없습니다</p>;
  }

  return (
    <ul className="space-y-2">
      {members.map((member) => {
        const displayName =
          member.is_guest && member.guest_name
            ? member.guest_name
            : member.user?.nickname || "알 수 없음";
        const position = member.is_guest ? "용병" : member.user?.position;
        const roleLabel =
          member.role === "OWNER"
            ? "팀장"
            : member.role === "MANAGER"
            ? "운영진"
            : null;

        return (
          <li
            key={member.id}
            className={`flex items-center justify-between rounded-lg bg-surface-700 px-4 py-3 ${
              enableClick && !showActions
                ? "cursor-pointer hover:bg-surface-600 transition-colors"
                : ""
            }`}
            onClick={() => handleMemberClick(member.id)}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-800 text-sm font-medium">
                {member.back_number || displayName.charAt(0)}
              </div>
              <div>
                <p className="font-medium">
                  {displayName}
                  {roleLabel && (
                    <span className="ml-2 rounded bg-primary-500/20 px-1.5 py-0.5 text-xs text-primary-500">
                      {roleLabel}
                    </span>
                  )}
                </p>
                {position && (
                  <p className="text-sm text-text-400">{position}</p>
                )}
              </div>
            </div>
            {showActions && isManager && (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleApprove(member.id)}
                  disabled={loadingId === member.id}
                  className="rounded-lg bg-constructive/20 p-2 text-constructive hover:bg-constructive/30 disabled:opacity-50"
                >
                  <Check className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleReject(member.id)}
                  disabled={loadingId === member.id}
                  className="rounded-lg bg-destructive/20 p-2 text-destructive hover:bg-destructive/30 disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
