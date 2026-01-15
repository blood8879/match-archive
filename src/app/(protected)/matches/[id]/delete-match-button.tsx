"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AlertModal } from "@/components/ui/alert-modal";

interface DeleteMatchButtonProps {
  matchId: string;
  teamId: string;
}

export function DeleteMatchButton({ matchId, teamId }: DeleteMatchButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const showErrorModal = (message: string) => {
    setModalMessage(message);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/matches/${matchId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete match");
      }

      // 삭제 후 팀 경기 관리 페이지로 이동
      router.push(`/teams/${teamId}/manage/matches`);
    } catch (error) {
      console.error("Failed to delete match:", error);
      showErrorModal("경기 삭제에 실패했습니다");
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  if (showConfirm) {
    return (
      <>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isDeleting ? "삭제 중..." : "삭제 확인"}
          </button>
          <button
            onClick={handleCancel}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg bg-[#214a36] hover:bg-[#2b5d45] text-white text-sm font-medium transition-colors"
          >
            취소
          </button>
        </div>
        <AlertModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          type="error"
          message={modalMessage}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleDelete}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-medium transition-colors"
      >
        <Trash2 className="h-4 w-4" />
        경기 삭제
      </button>
      <AlertModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        type="error"
        message={modalMessage}
      />
    </>
  );
}
