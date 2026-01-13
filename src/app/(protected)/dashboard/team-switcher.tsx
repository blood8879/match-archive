"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, Zap } from "lucide-react";

interface TeamItem {
  id: string;
  name: string;
  emblem_url: string | null;
  role: "OWNER" | "MANAGER" | "MEMBER";
}

interface TeamSwitcherProps {
  teams: TeamItem[];
  currentTeamId: string;
}

export function TeamSwitcher({ teams, currentTeamId }: TeamSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTeamSelect = (teamId: string) => {
    setIsOpen(false);
    router.push(`/dashboard?team=${teamId}`);
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case "OWNER":
        return "팀장";
      case "MANAGER":
        return "운영진";
      default:
        return "선수";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white/70 hover:text-white transition-all"
      >
        <span>라커룸 이동</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-[#1a3d2e] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
          <div className="p-2 border-b border-white/10">
            <p className="text-xs font-bold text-white/40 uppercase tracking-wider px-2">내 팀 목록</p>
          </div>
          <div className="p-2 max-h-[300px] overflow-y-auto">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => handleTeamSelect(team.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  team.id === currentTeamId
                    ? "bg-[#00e677]/20 text-white"
                    : "hover:bg-white/5 text-white/70 hover:text-white"
                }`}
              >
                <div className="size-8 rounded-full bg-[#214a36] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {team.emblem_url ? (
                    <img
                      src={team.emblem_url}
                      alt={team.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Zap className="w-4 h-4 text-[#00e677]" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium truncate">{team.name}</p>
                  <p className="text-[10px] text-white/40">{roleLabel(team.role)}</p>
                </div>
                {team.id === currentTeamId && (
                  <Check className="w-4 h-4 text-[#00e677] flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
