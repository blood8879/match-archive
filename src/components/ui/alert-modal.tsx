"use client";

import { useEffect, useRef } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export type AlertType = "success" | "error" | "info" | "warning";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
  showCancel?: boolean;
  cancelText?: string;
  onConfirm?: () => void;
  navigateBack?: boolean;
}

export function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  type = "info",
  confirmText = "확인",
  showCancel = false,
  cancelText = "취소",
  onConfirm,
  navigateBack = false,
}: AlertModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
    if (navigateBack) {
      router.back();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle className="w-12 h-12 text-[#00e677]" />,
    error: <AlertCircle className="w-12 h-12 text-red-400" />,
    info: <Info className="w-12 h-12 text-blue-400" />,
    warning: <AlertTriangle className="w-12 h-12 text-yellow-400" />,
  };

  const bgColors = {
    success: "bg-[#00e677]/10",
    error: "bg-red-500/10",
    info: "bg-blue-500/10",
    warning: "bg-yellow-500/10",
  };

  const defaultTitles = {
    success: "완료",
    error: "오류",
    info: "알림",
    warning: "주의",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-sm bg-[#1a2f25] rounded-2xl border border-[#8eccae]/20 shadow-2xl animate-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center p-6 pt-8">
          {/* Icon */}
          <div className={`p-4 rounded-full ${bgColors[type]} mb-4`}>
            {icons[type]}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-white mb-2">
            {title || defaultTitles[type]}
          </h3>

          {/* Message */}
          <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 pt-0">
          {showCancel && (
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
              type === "error"
                ? "bg-red-500 text-white hover:bg-red-600"
                : type === "warning"
                ? "bg-yellow-500 text-black hover:bg-yellow-600"
                : "bg-[#00e677] text-[#0f2319] hover:bg-green-400"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Custom hook for easier usage
import { useState, useCallback } from "react";

interface UseAlertModalReturn {
  showAlert: (config: Omit<AlertModalProps, "isOpen" | "onClose">) => void;
  AlertModalComponent: React.ReactNode;
}

export function useAlertModal(): UseAlertModalReturn {
  const [modalConfig, setModalConfig] = useState<Omit<AlertModalProps, "isOpen" | "onClose"> | null>(null);

  const showAlert = useCallback((config: Omit<AlertModalProps, "isOpen" | "onClose">) => {
    setModalConfig(config);
  }, []);

  const handleClose = useCallback(() => {
    setModalConfig(null);
  }, []);

  const AlertModalComponent = modalConfig ? (
    <AlertModal
      isOpen={true}
      onClose={handleClose}
      {...modalConfig}
    />
  ) : null;

  return { showAlert, AlertModalComponent };
}
