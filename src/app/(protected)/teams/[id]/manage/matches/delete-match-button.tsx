"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertModal } from "@/components/ui/alert-modal";

interface DeleteMatchButtonProps {
  matchId: string;
  teamId: string;
}

export function DeleteMatchButton({ matchId }: DeleteMatchButtonProps) {
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

      router.refresh();
      setShowConfirm(false);
    } catch (error) {
      console.error("Failed to delete match:", error);
      showErrorModal("경기 삭제에 실패했습니다");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  if (showConfirm) {
    return (
      <>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "삭제 중..." : "확인"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isDeleting}
          >
            취소
          </Button>
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
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
      <AlertModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        type="error"
        message={modalMessage}
      />
    </>
  );
}
