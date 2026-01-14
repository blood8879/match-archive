"use client";

import { useState } from "react";
import { Hash, Copy, Check } from "lucide-react";

interface PlayerCodeBadgeProps {
  code: string;
}

export function PlayerCodeBadge({ code }: PlayerCodeBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
      title="클릭하여 복사"
    >
      <Hash className="w-3.5 h-3.5 text-white/50" />
      <span className="font-mono text-sm tracking-wider text-white/70">{code}</span>
      {copied ? (
        <Check className="w-3.5 h-3.5 text-[#00e677]" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-white/30 group-hover:text-white/60 transition-colors" />
      )}
    </button>
  );
}
