"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, ChevronDown, SlidersHorizontal } from "lucide-react";

const REGIONS = [
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "대전",
  "광주",
  "울산",
  "세종",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
];

interface TeamSearchFormProps {
  initialRegion?: string;
  initialQuery?: string;
}

export function TeamSearchForm({
  initialRegion,
  initialQuery,
}: TeamSearchFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery || "");
  const [region, setRegion] = useState(initialRegion || "");

  const handleSearch = (newQuery?: string, newRegion?: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newQuery !== undefined) {
      if (newQuery) {
        params.set("q", newQuery);
      } else {
        params.delete("q");
      }
    }

    if (newRegion !== undefined) {
      if (newRegion) {
        params.set("region", newRegion);
      } else {
        params.delete("region");
      }
    }

    router.push(`/teams?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-[#162e24]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-2 md:p-3 shadow-xl shadow-black/20">
        <div className="flex w-full items-center">
          <div className="pl-4 pr-2 text-[#00e677]">
            <Search className="w-6 h-6" />
          </div>
          <input
            className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 focus:outline-none text-lg py-3"
            placeholder="팀명, 지역명으로 검색 (예: FC 타이거, 강남구)"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch(query, undefined);
              }
            }}
          />
          <button
            onClick={() => handleSearch(query, undefined)}
            className="hidden sm:flex bg-[#00e677] hover:bg-green-400 text-[#0f2319] font-bold py-2 px-6 rounded-xl transition-colors items-center gap-1"
          >
            <span>검색</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-gray-400 text-sm font-medium mr-2 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          필터:
        </span>
        <div className="relative group">
          <select
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              handleSearch(undefined, e.target.value);
            }}
            className="appearance-none flex items-center gap-2 px-4 py-2 pr-10 rounded-xl bg-[#162e24] border border-white/5 hover:border-[#00e677]/50 text-gray-300 hover:text-white transition-all text-sm cursor-pointer focus:outline-none focus:border-[#00e677]/50"
          >
            <option value="">지역: 전체</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#162e24] border border-white/5 hover:border-[#00e677]/50 text-gray-300 hover:text-white transition-all text-sm group">
          <span>활동 요일</span>
          <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-[#00e677]" />
        </button>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#162e24] border border-white/5 hover:border-[#00e677]/50 text-gray-300 hover:text-white transition-all text-sm group">
          <span>실력: 전체</span>
          <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-[#00e677]" />
        </button>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#162e24] border border-white/5 hover:border-[#00e677]/50 text-gray-300 hover:text-white transition-all text-sm group">
          <span>모집 상태</span>
          <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-[#00e677]" />
        </button>
      </div>
    </div>
  );
}
