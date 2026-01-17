"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Select, SelectItem } from "@/components/ui/select";
import { area } from "@/constants/area";

interface TeamSearchFormProps {
  initialRegion?: string;
  initialQuery?: string;
  initialDay?: string;
  initialLevel?: string;
  initialRecruiting?: string;
}

export function TeamSearchForm({
  initialRegion,
  initialQuery,
  initialDay,
  initialLevel,
  initialRecruiting,
}: TeamSearchFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery || "");

  const parseInitialRegion = (region?: string) => {
    if (!region) return { city: "", district: "" };
    const parts = region.split(" ");
    return { city: parts[0] || "", district: parts[1] || "" };
  };

  const initialParsed = parseInitialRegion(initialRegion);
  const [selectedCity, setSelectedCity] = useState(initialParsed.city);
  const [selectedDistrict, setSelectedDistrict] = useState(initialParsed.district);
  const [selectedDay, setSelectedDay] = useState(initialDay || "");
  const [selectedLevel, setSelectedLevel] = useState(initialLevel || "");
  const [selectedRecruiting, setSelectedRecruiting] = useState(initialRecruiting || "");

  // 선택된 시/도의 구/군 목록
  const districts = area.find((a) => a.name === selectedCity)?.subArea || [];

  const handleSearch = (updates: {
    query?: string;
    region?: string;
    day?: string;
    level?: string;
    recruiting?: string;
  } = {}) => {
    const params = new URLSearchParams(searchParams.toString());

    const setOrDelete = (key: string, value: string | undefined) => {
      if (value !== undefined) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
    };

    setOrDelete("q", updates.query);
    setOrDelete("region", updates.region);
    setOrDelete("day", updates.day);
    setOrDelete("level", updates.level);
    setOrDelete("recruiting", updates.recruiting);

    router.push(`/teams?${params.toString()}`);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch({ query });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

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
                handleSearch({ query });
              }
            }}
          />
          <button
            onClick={() => handleSearch({ query })}
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
        {/* 시/도 선택 */}
        <Select
          value={selectedCity}
          onValueChange={(newCity) => {
            setSelectedCity(newCity);
            setSelectedDistrict("");
            handleSearch({ region: newCity });
          }}
          placeholder="시/도: 전체"
          className="min-w-[120px]"
        >
          {area.map((a) => (
            <SelectItem key={a.name} value={a.name}>
              {a.name}
            </SelectItem>
          ))}
        </Select>
        {/* 구/군 선택 */}
        <Select
          value={selectedDistrict}
          onValueChange={(newDistrict) => {
            setSelectedDistrict(newDistrict);
            const newRegion = newDistrict ? `${selectedCity} ${newDistrict}` : selectedCity;
            handleSearch({ region: newRegion });
          }}
          placeholder="구/군: 전체"
          disabled={!selectedCity}
          className="min-w-[120px]"
        >
          {districts.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </Select>
        <Select
          value={selectedDay}
          onValueChange={(val) => {
            setSelectedDay(val);
            handleSearch({ day: val });
          }}
          placeholder="활동 요일"
        >
          <SelectItem value="월">월요일</SelectItem>
          <SelectItem value="화">화요일</SelectItem>
          <SelectItem value="수">수요일</SelectItem>
          <SelectItem value="목">목요일</SelectItem>
          <SelectItem value="금">금요일</SelectItem>
          <SelectItem value="토">토요일</SelectItem>
          <SelectItem value="일">일요일</SelectItem>
          <SelectItem value="평일">평일</SelectItem>
          <SelectItem value="주말">주말</SelectItem>
        </Select>
        <Select
          value={selectedLevel}
          onValueChange={(val) => {
            setSelectedLevel(val);
            handleSearch({ level: val });
          }}
          placeholder="실력: 전체"
        >
          <SelectItem value="1-3">입문 (LV.1-3)</SelectItem>
          <SelectItem value="4-5">초급 (LV.4-5)</SelectItem>
          <SelectItem value="6-7">중급 (LV.6-7)</SelectItem>
          <SelectItem value="8-9">상급 (LV.8-9)</SelectItem>
          <SelectItem value="10">프로 (LV.10)</SelectItem>
        </Select>
        <Select
          value={selectedRecruiting}
          onValueChange={(val) => {
            setSelectedRecruiting(val);
            handleSearch({ recruiting: val });
          }}
          placeholder="모집 상태"
        >
          <SelectItem value="recruiting">모집중</SelectItem>
          <SelectItem value="not-recruiting">모집안함</SelectItem>
        </Select>
      </div>
    </div>
  );
}
