"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, User, ArrowRight, Zap } from "lucide-react";
import type { RecordMergeRequestWithDetails } from "@/types/supabase";
import { cancelMergeRequest } from "@/services/record-merge";
import { AlertModal, type AlertType } from "@/components/ui/alert-modal";

interface PendingMergeRequestsListProps {
  requests: RecordMergeRequestWithDetails[];
  teamId: string;
}

export function PendingMergeRequestsList({
  requests,
}: PendingMergeRequestsListProps) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    type: AlertType;
    message: string;
    showCancel?: boolean;
    onConfirm?: () => void;
  }>({ type: "info", message: "" });

  const showModal = (
    type: AlertType,
    message: string,
    showCancel = false,
    onConfirm?: () => void
  ) => {
    setModalConfig({ type, message, showCancel, onConfirm });
    setModalOpen(true);
  };

  const handleCancel = async (requestId: string, guestName: string, inviteeName: string) => {
    showModal(
      "warning",
      `${guestName}의 기록을 ${inviteeName}님에게 병합하는 요청을 취소하시겠습니까?`,
      true,
      async () => {
        setCancellingId(requestId);

        try {
          await cancelMergeRequest(requestId);
          router.refresh();
        } catch (error) {
          showModal("error", error instanceof Error ? error.message : "취소에 실패했습니다");
        } finally {
          setCancellingId(null);
        }
      }
    );
  };

  return (
    <>
      <div className="space-y-3">
        {requests.map((request) => {
          const guestName = request.guest_member?.guest_name || "용병";
          const inviteeName = request.invitee?.nickname || "사용자";

          return (
            <div
              key={request.id}
              className="flex items-center justify-between p-4 rounded-xl bg-surface-700/50"
            >
              <div className="flex items-center gap-4">
                {/* 용병 정보 */}
                <div className="flex items-center gap-2">
                  <div className="size-10 rounded-full bg-accent-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-accent-500" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{guestName}</p>
                    <p className="text-xs text-text-muted">용병</p>
                  </div>
                </div>

                <ArrowRight className="w-5 h-5 text-text-muted" />

                {/* 대상 사용자 정보 */}
                <div className="flex items-center gap-2">
                  <div className="size-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    {request.invitee?.avatar_url ? (
                      <img
                        src={request.invitee.avatar_url}
                        alt={inviteeName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-purple-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white">{inviteeName}</p>
                    <p className="text-xs text-text-muted">대기 중</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted">
                  {new Date(request.created_at).toLocaleDateString("ko-KR")}
                </span>
                <button
                  onClick={() => handleCancel(request.id, guestName, inviteeName)}
                  disabled={cancellingId === request.id}
                  className="p-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors disabled:opacity-50"
                  title="요청 취소"
                >
                  {cancellingId === request.id ? (
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

      {/* Alert Modal */}
      <AlertModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        type={modalConfig.type}
        message={modalConfig.message}
        showCancel={modalConfig.showCancel}
        onConfirm={modalConfig.onConfirm}
      />
    </>
  );
}
