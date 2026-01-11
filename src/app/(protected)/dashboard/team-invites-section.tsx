"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  acceptTeamInvite,
  rejectTeamInvite,
  type TeamInviteWithUsers,
} from "@/services/invites";
import { Mail, Check, X, Loader2 } from "lucide-react";

interface TeamInvitesSectionProps {
  invites: TeamInviteWithUsers[];
}

export function TeamInvitesSection({ invites }: TeamInvitesSectionProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"accept" | "reject" | null>(
    null
  );

  if (invites.length === 0) {
    return null;
  }

  const handleAccept = async (inviteId: string) => {
    setLoadingId(inviteId);
    setActionType("accept");

    try {
      await acceptTeamInvite(inviteId);
      router.refresh();
    } catch (error) {
      console.error("Failed to accept invite:", error);
      alert(
        error instanceof Error
          ? error.message
          : "초대 수락에 실패했습니다"
      );
    } finally {
      setLoadingId(null);
      setActionType(null);
    }
  };

  const handleReject = async (inviteId: string) => {
    setLoadingId(inviteId);
    setActionType("reject");

    try {
      await rejectTeamInvite(inviteId);
      router.refresh();
    } catch (error) {
      console.error("Failed to reject invite:", error);
      alert(
        error instanceof Error
          ? error.message
          : "초대 거절에 실패했습니다"
      );
    } finally {
      setLoadingId(null);
      setActionType(null);
    }
  };

  return (
    <section className="mb-6">
      <div className="glass-card rounded-2xl p-6 border-2 border-[#FFC400]/30 bg-[#3d2800]/40 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#FFC400]/20 rounded-lg">
            <Mail className="w-6 h-6 text-[#FFC400]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              팀 초대 ({invites.length})
            </h2>
            <p className="text-sm text-text-400 mt-0.5">
              새로운 팀 초대가 도착했습니다
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {invites.map((invite) => {
            const teamName = invite.team?.name || "알 수 없는 팀";
            const inviterName =
              invite.inviter?.nickname || "알 수 없는 사용자";

            return (
              <div
                key={invite.id}
                className="flex items-center justify-between p-4 rounded-lg bg-surface-700/50 border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-base font-bold text-primary">
                    {teamName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">
                      {teamName}
                    </p>
                    <p className="text-sm text-text-400 mt-1">
                      {inviterName}님이 초대했습니다
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAccept(invite.id)}
                    disabled={loadingId === invite.id}
                    className="px-4 py-2 rounded-lg bg-constructive/20 text-constructive hover:bg-constructive/30 disabled:opacity-50 transition-colors font-medium text-sm flex items-center gap-1"
                    title="수락"
                  >
                    {loadingId === invite.id && actionType === "accept" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    수락
                  </button>
                  <button
                    onClick={() => handleReject(invite.id)}
                    disabled={loadingId === invite.id}
                    className="p-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 disabled:opacity-50 transition-colors"
                    title="거절"
                  >
                    {loadingId === invite.id && actionType === "reject" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
