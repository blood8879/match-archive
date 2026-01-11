"use client";

import { useState, useTransition } from "react";
import { updateAttendance } from "@/services/matches";
import { Check, HelpCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceButtonProps {
  matchId: string;
  currentStatus: "attending" | "maybe" | "absent" | null;
  isFinished: boolean;
}

export function AttendanceButton({
  matchId,
  currentStatus,
  isFinished,
}: AttendanceButtonProps) {
  const [optimisticStatus, setOptimisticStatus] = useState<
    "attending" | "maybe" | "absent" | null
  >(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = (status: "attending" | "maybe" | "absent") => {
    if (isFinished) return;

    // Optimistic update
    const newStatus = optimisticStatus === status ? null : status;
    setOptimisticStatus(newStatus);
    setError(null);

    if (newStatus === null) {
      // If deselecting, revert optimistic update
      setOptimisticStatus(currentStatus);
      return;
    }

    startTransition(async () => {
      try {
        await updateAttendance(matchId, status);
      } catch (err) {
        // Revert on error
        setOptimisticStatus(currentStatus);
        setError(
          err instanceof Error ? err.message : "참석 상태 변경에 실패했습니다"
        );
      }
    });
  };

  const buttons: Array<{
    status: "attending" | "maybe" | "absent";
    icon: typeof Check;
    label: string;
    activeClass: string;
    inactiveClass: string;
  }> = [
    {
      status: "attending",
      icon: Check,
      label: "참석",
      activeClass:
        "bg-[#00e677] text-[#0f2319] border-[#00e677] shadow-[0_0_20px_rgba(0,230,119,0.4)]",
      inactiveClass:
        "bg-[#00e677]/10 text-[#00e677] border-[#00e677]/30 hover:bg-[#00e677]/20",
    },
    {
      status: "maybe",
      icon: HelpCircle,
      label: "미정",
      activeClass:
        "bg-gray-500 text-white border-gray-500 shadow-[0_0_20px_rgba(107,114,128,0.4)]",
      inactiveClass:
        "bg-gray-500/10 text-gray-400 border-gray-500/30 hover:bg-gray-500/20",
    },
    {
      status: "absent",
      icon: X,
      label: "불참",
      activeClass:
        "bg-destructive text-white border-destructive shadow-[0_0_20px_rgba(255,23,68,0.4)]",
      inactiveClass:
        "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {buttons.map(
          ({ status, icon: Icon, label, activeClass, inactiveClass }) => {
            const isActive = optimisticStatus === status;

            return (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                disabled={isFinished || isPending}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all touch-feedback font-bold",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-dark",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-opacity-10",
                  isActive ? activeClass : inactiveClass,
                  isPending && "opacity-70"
                )}
              >
                <Icon
                  className={cn(
                    "h-6 w-6 transition-transform",
                    isActive && "scale-110"
                  )}
                />
                <span className="text-sm">{label}</span>
              </button>
            );
          }
        )}
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {isFinished && (
        <div className="px-4 py-3 rounded-lg bg-surface-700 border border-white/10">
          <p className="text-sm text-text-400 text-center">
            경기가 종료되어 참석 상태를 변경할 수 없습니다
          </p>
        </div>
      )}
    </div>
  );
}
