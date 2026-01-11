"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface CopyCodeButtonProps {
  code: string;
}

export function CopyCodeButton({ code }: CopyCodeButtonProps) {
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
    <div className="flex items-center gap-3 bg-[#214a36] px-6 py-3 rounded-xl border border-[#00e677]/20">
      <span className="text-2xl font-mono font-bold text-[#00e677] tracking-wider">
        {code}
      </span>
      <button
        onClick={handleCopy}
        className="p-2 hover:bg-[#00e677]/10 rounded-lg transition-colors"
        title={copied ? "복사됨!" : "코드 복사"}
      >
        {copied ? (
          <Check className="w-5 h-5 text-[#00e677]" />
        ) : (
          <Copy className="w-5 h-5 text-[#00e677]" />
        )}
      </button>
    </div>
  );
}
