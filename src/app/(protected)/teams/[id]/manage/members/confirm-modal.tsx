"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: "default" | "destructive";
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "확인",
  cancelText = "취소",
  isLoading = false,
  variant = "default",
}: ConfirmModalProps) {
  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // 모달이 열릴 때 body 스크롤 방지
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="glass-card rounded-2xl p-6 shadow-2xl border border-white/10">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="닫기"
            >
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>

          {/* Message */}
          <p className="text-text-400 mb-6 leading-relaxed">{message}</p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1 h-11 px-4 rounded-xl bg-surface-700 hover:bg-surface-dark-hover text-white font-semibold transition-colors border border-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`flex-1 h-11 px-4 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                variant === "destructive"
                  ? "bg-destructive hover:bg-destructive/90 text-white"
                  : "bg-primary hover:bg-primary-dark text-black"
              }`}
            >
              {isLoading ? "처리 중..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
