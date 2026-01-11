"use client";

import { useState, useTransition } from "react";
import { updateMatchScore } from "@/services/matches";
import { Minus, Plus, Info } from "lucide-react";

interface ScoreFormProps {
  matchId: string;
  homeScore: number;
  awayScore: number;
}

export function ScoreForm({
  matchId,
  homeScore: initialHome,
  awayScore: initialAway,
}: ScoreFormProps) {
  const [homeScore, setHomeScore] = useState(initialHome);
  const [awayScore, setAwayScore] = useState(initialAway);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      await updateMatchScore(matchId, homeScore, awayScore);
    });
  };

  const hasChanges = homeScore !== initialHome || awayScore !== initialAway;

  return (
    <div className="space-y-4">
      {/* Score Input */}
      <div className="flex items-center justify-center gap-6">
        {/* Home Score */}
        <div className="flex-1 max-w-[140px]">
          <p className="text-[#8eccae] text-xs font-medium mb-2 text-center">
            HOME
          </p>
          <div className="flex items-center gap-2 bg-[#162e23] rounded-lg p-1.5 border border-[#214a36]">
            <button
              type="button"
              onClick={() => setHomeScore(Math.max(0, homeScore - 1))}
              className="size-8 rounded-md flex items-center justify-center text-[#8eccae] hover:bg-[#214a36] hover:text-white transition-colors"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="flex-1 text-center text-3xl font-black text-white tabular-nums">
              {homeScore}
            </span>
            <button
              type="button"
              onClick={() => setHomeScore(homeScore + 1)}
              className="size-8 rounded-md flex items-center justify-center bg-[#00e677] text-[#0f2319] hover:bg-green-400 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <span className="text-2xl text-[#8eccae]/50 font-thin mt-6">:</span>

        {/* Away Score */}
        <div className="flex-1 max-w-[140px]">
          <p className="text-[#8eccae] text-xs font-medium mb-2 text-center">
            AWAY
          </p>
          <div className="flex items-center gap-2 bg-[#162e23] rounded-lg p-1.5 border border-[#214a36]">
            <button
              type="button"
              onClick={() => setAwayScore(Math.max(0, awayScore - 1))}
              className="size-8 rounded-md flex items-center justify-center text-[#8eccae] hover:bg-[#214a36] hover:text-white transition-colors"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="flex-1 text-center text-3xl font-black text-white tabular-nums">
              {awayScore}
            </span>
            <button
              type="button"
              onClick={() => setAwayScore(awayScore + 1)}
              className="size-8 rounded-md flex items-center justify-center bg-[#214a36] text-[#00e677] hover:bg-[#2f6a4d] transition-colors border border-[#00e677]/20"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex items-start gap-2 p-3 bg-[#00e677]/5 border border-[#00e677]/20 rounded-lg">
          <Info className="h-4 w-4 text-[#00e677] mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-xs text-[#8eccae]">
            스코어는 실시간 업데이트되지 않습니다. 변경사항을 저장해주세요.
          </div>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-1.5 rounded-md bg-[#00e677] hover:bg-green-400 text-[#0f2319] font-bold text-sm transition-colors disabled:opacity-50"
          >
            {isPending ? "저장중..." : "저장하기"}
          </button>
        </div>
      )}
    </div>
  );
}
