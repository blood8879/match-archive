"use client";

import { useState } from "react";
import { Target, ChevronDown, ChevronUp } from "lucide-react";
import { ScoreForm } from "./score-form";

interface ScoreInputSectionProps {
  matchId: string;
  homeScore: number;
  awayScore: number;
}

export function ScoreInputSection({
  matchId,
  homeScore,
  awayScore,
}: ScoreInputSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="glass-panel rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-[#162e23]/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1 bg-[#00e677]/20 rounded-md">
            <Target className="h-4 w-4 text-[#00e677]" />
          </div>
          <h3 className="text-white text-sm font-bold">경기 결과 입력</h3>
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-[#8eccae]" />
        ) : (
          <ChevronDown className="h-5 w-5 text-[#8eccae]" />
        )}
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-2 border-t border-[#214a36]">
          <ScoreForm
            matchId={matchId}
            homeScore={homeScore}
            awayScore={awayScore}
          />
        </div>
      )}
    </section>
  );
}
