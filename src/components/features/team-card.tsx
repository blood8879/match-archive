import Link from "next/link";
import { MapPin, Zap } from "lucide-react";
import type { Team } from "@/types/supabase";

interface TeamCardProps {
  team: Team;
}

export function TeamCard({ team }: TeamCardProps) {
  return (
    <Link href={`/teams/${team.id}`}>
      <div className="bg-[#162e24]/60 backdrop-blur-xl border border-white/[0.08] group relative flex flex-col items-center rounded-2xl p-6 transition-all hover:translate-y-[-4px] hover:shadow-lg hover:shadow-[#00e677]/10 hover:border-[#00e677]/30 cursor-pointer">
        <div className="absolute top-4 right-4">
          {team.is_recruiting ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#00e677]/20 text-[#00e677] border border-[#00e677]/20">
              모집중
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/20">
              모집마감
            </span>
          )}
        </div>
        
        <div className="w-24 h-24 mb-4 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 ring-4 ring-white/5 group-hover:ring-[#00e677]/50 transition-all flex items-center justify-center overflow-hidden">
          {team.emblem_url ? (
            <img
              src={team.emblem_url}
              alt={team.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#1a4031] flex items-center justify-center">
              <Zap className="w-10 h-10 text-[#00e677]" />
            </div>
          )}
        </div>
        
        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[#00e677] transition-colors">
          {team.name}
        </h3>
        
        <div className="flex items-center gap-1 text-gray-400 text-sm mb-4">
          <MapPin className="w-4 h-4" />
          <span>{team.region || "지역 미설정"}</span>
        </div>
        
        <div className="w-full grid grid-cols-2 gap-2 text-center text-xs text-gray-400 bg-black/20 rounded-lg p-3 mb-4">
          <div className="flex flex-col border-r border-white/5">
            <span className="text-white font-semibold text-sm">{team.member_count || 0}명</span>
            <span>멤버수</span>
          </div>
          <div className="flex flex-col">
            <span className="text-white font-semibold text-sm">아마추어</span>
            <span>팀 레벨</span>
          </div>
        </div>
        
        <div className="w-full py-2.5 rounded-lg bg-[#162e24] hover:bg-[#00e677] hover:text-[#0f2319] text-white font-medium text-sm transition-all duration-300 border border-white/5 text-center">
          상세 보기
        </div>
      </div>
    </Link>
  );
}
