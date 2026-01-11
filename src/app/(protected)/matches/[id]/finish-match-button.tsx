"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { finishMatch } from "@/services/matches";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface FinishMatchButtonProps {
  matchId: string;
}

export function FinishMatchButton({ matchId }: FinishMatchButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleFinish = () => {
    startTransition(async () => {
      await finishMatch(matchId);
      router.refresh();
    });
  };

  if (showConfirm) {
    return (
      <div className="flex items-center gap-3 bg-[#162e23] px-4 py-3 rounded-xl border border-[#214a36]">
        <span className="text-sm text-[#8eccae]">경기를 종료하시겠습니까?</span>
        <button
          type="button"
          onClick={() => setShowConfirm(false)}
          className="h-9 px-4 rounded-lg bg-[#214a36] hover:bg-[#2b5d45] text-white text-sm font-medium transition-colors"
        >
          취소
        </button>
        <Button
          onClick={handleFinish}
          isLoading={isPending}
          className="h-9 px-4 bg-[#00e677] hover:bg-green-400 text-[#0f2319] font-bold rounded-lg"
        >
          종료
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowConfirm(true)}
      className="flex items-center gap-3 px-6 py-4 bg-[#00e677] text-[#0f2319] text-lg font-bold rounded-full shadow-[0_0_20px_rgba(0,230,119,0.4)] hover:shadow-[0_0_30px_rgba(0,230,119,0.6)] hover:-translate-y-1 transition-all active:translate-y-0"
    >
      <CheckCircle className="h-5 w-5" />
      경기 종료
    </button>
  );
}
