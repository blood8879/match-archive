import { Suspense } from "react";
import Link from "next/link";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { getTeams } from "@/services/teams";
import { TeamCard } from "@/components/features/team-card";
import { TeamSearchForm } from "./team-search-form";

interface TeamsPageProps {
  searchParams: Promise<{ 
    region?: string; 
    q?: string;
    day?: string;
    level?: string;
    recruiting?: string;
  }>;
}

async function TeamsList({
  region,
  query,
  day,
  level,
  recruiting,
}: {
  region?: string;
  query?: string;
  day?: string;
  level?: string;
  recruiting?: string;
}) {
  const teams = await getTeams({ region, query, day, level, recruiting });

  if (teams.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-400">
          {query || region ? "검색 결과가 없습니다" : "등록된 팀이 없습니다"}
        </p>
        <Link
          href="/teams/new"
          className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-[#00e677] hover:bg-green-400 text-[#0f2319] font-bold rounded-xl transition-all"
        >
          <Plus className="w-5 h-5" />
          첫 팀 만들기
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {teams.map((team) => (
        <TeamCard key={team.id} team={team} />
      ))}
    </div>
  );
}

export default async function TeamsPage({ searchParams }: TeamsPageProps) {
  const params = await searchParams;
  const region = params.region;
  const query = params.q;
  const day = params.day;
  const level = params.level;
  const recruiting = params.recruiting;

  return (
    <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
      <div className="flex flex-col gap-8 mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              새로운 팀을 <span className="text-[#00e677]">찾아보세요</span>
            </h1>
            <p className="text-gray-400 text-base md:text-lg max-w-2xl">
              나의 실력과 지역에 맞는 최고의 팀을 검색하고 가입하세요. 함께 뛸 동료들이 기다리고 있습니다.
            </p>
          </div>
          <Link
            href="/teams/new"
            className="flex items-center gap-2 px-6 py-3 bg-[#00e677] hover:bg-green-400 text-[#0f2319] font-bold rounded-xl transition-all shadow-lg shadow-[#00e677]/20 h-fit"
          >
            <Plus className="w-5 h-5" />
            팀 만들기
          </Link>
        </div>

        <TeamSearchForm 
          initialRegion={region} 
          initialQuery={query}
          initialDay={day}
          initialLevel={level}
          initialRecruiting={recruiting}
        />
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-[#162e24]/60 rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        }
      >
        <TeamsList region={region} query={query} day={day} level={level} recruiting={recruiting} />
      </Suspense>

      <div className="flex justify-center mt-12 gap-2">
        <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#162e24] border border-white/5 text-gray-400 hover:text-white hover:border-[#00e677]/50 transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#00e677] text-[#0f2319] font-bold border border-[#00e677]">
          1
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#162e24] border border-white/5 text-gray-400 hover:text-white hover:border-[#00e677]/50 transition-all">
          2
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#162e24] border border-white/5 text-gray-400 hover:text-white hover:border-[#00e677]/50 transition-all">
          3
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#162e24] border border-white/5 text-gray-400 hover:text-white hover:border-[#00e677]/50 transition-all">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </main>
  );
}
