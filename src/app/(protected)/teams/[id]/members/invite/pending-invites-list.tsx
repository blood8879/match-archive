"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelTeamInvite, type TeamInviteWithUsers } from "@/services/invites";
import { X, Loader2, Clock } from "lucide-react";
import { ConfirmModal } from "../../manage/members/confirm-modal";

interface PendingInvitesListProps {
  invites: TeamInviteWithUsers[];
}

export function PendingInvitesList({ invites }: PendingInvitesListProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    inviteId: string;
    userName: string;
  }>({ isOpen: false, inviteId: "", userName: "" });

  const handleCancel = async (inviteId: string, userName: string) => {
    setConfirmModal({
      isOpen: true,
      inviteId,
      userName,
    });
  };

  const handleConfirmCancel = async () => {
    const { inviteId } = confirmModal;

    setLoadingId(inviteId);
    try {
      await cancelTeamInvite(inviteId);
      router.refresh();
      setConfirmModal({ isOpen: false, inviteId: "", userName: "" });
    } catch (error) {
      console.error("Failed to cancel invite:", error);
    } finally {
      setLoadingId(null);
    }
  };

  if (invites.length === 0) {
    return (
      <div className="text-center py-8 text-text-400">
        대기 중인 초대가 없습니다
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {invites.map((invite) => {
          const userName =
            invite.invitee?.nickname || invite.invitee?.id.slice(0, 8);

          return (
            <div
              key={invite.id}
              className="flex items-center justify-between p-4 rounded-lg bg-surface-700 border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-800 text-base font-bold text-primary">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white truncate">
                      {userName}
                    </p>
                    <span className="bg-caution/10 text-caution text-xs px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      대기중
                    </span>
                  </div>
                  <p className="text-sm text-text-400 mt-1">
                    초대 전송: {new Date(invite.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleCancel(invite.id, userName)}
                disabled={loadingId === invite.id}
                className="p-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 disabled:opacity-50 transition-colors"
                title="초대 취소"
              >
                {loadingId === invite.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <X className="w-5 h-5" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() =>
          setConfirmModal({ isOpen: false, inviteId: "", userName: "" })
        }
        onConfirm={handleConfirmCancel}
        title="초대 취소"
        message={`${confirmModal.userName}님에게 보낸 초대를 취소하시겠습니까?`}
        confirmText="취소"
        cancelText="돌아가기"
        isLoading={loadingId === confirmModal.inviteId}
        variant="destructive"
      />
    </>
  );
}
