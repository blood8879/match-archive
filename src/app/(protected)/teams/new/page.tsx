"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createTeam } from "@/services/teams";
import { ArrowLeft, Users, MapPin, PlusCircle, Camera, Pencil } from "lucide-react";

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

export default function NewTeamPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [homeColor, setHomeColor] = useState("#00e677");
  const [emblemPreview, setEmblemPreview] = useState<string | null>(null);

  const handleEmblemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 파일 크기 검증 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("파일 크기는 5MB를 초과할 수 없습니다");
        e.target.value = "";
        return;
      }

      // 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setEmblemPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const team = await createTeam(formData);
      router.push(`/teams/${team.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "팀 생성에 실패했습니다");
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-grow flex items-center justify-center p-6 sm:p-12 relative overflow-hidden min-h-screen">
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#00e677]/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-[#00e677]/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-[640px] flex flex-col gap-8 z-10">
        <div className="flex flex-col gap-2">
          <Link
            href="/teams"
            className="inline-flex items-center gap-2 text-[#8dceae] hover:text-white transition-colors w-fit mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">취소 및 뒤로 가기</span>
          </Link>
          <h1 className="text-white text-3xl md:text-4xl font-black leading-tight tracking-tight">새 팀 생성</h1>
          <p className="text-[#8dceae] text-base">새로운 팀 프로필을 생성하여 경기와 선수를 관리하세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#173627] border border-[#2e6b4e] rounded-xl p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center mb-8 pb-8 border-b border-[#2e6b4e] border-dashed">
            <div className="relative group cursor-pointer">
              <div className="size-24 rounded-full bg-[#1f4532] border-2 border-dashed border-[#8dceae] group-hover:border-[#00e677] group-hover:bg-[#1a402e] flex items-center justify-center transition-all duration-300 overflow-hidden">
                {emblemPreview ? (
                  <img src={emblemPreview} alt="Emblem preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-[#8dceae] group-hover:text-[#00e677]" />
                )}
                <input
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  type="file"
                  name="emblem"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={handleEmblemChange}
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-[#00e677] text-[#0f2319] rounded-full p-1 shadow-lg pointer-events-none">
                <Pencil className="w-3 h-3" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-white text-lg font-bold">엠블럼</label>
              <p className="text-[#8dceae] text-sm">팀 로고를 업로드하세요. 권장 크기: 500x500px (최대 5MB).</p>
              <span className="text-[#00e677] text-sm font-semibold cursor-pointer hover:underline text-left mt-1 w-fit">클릭하여 업로드</span>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-white text-sm font-bold uppercase tracking-wide" htmlFor="team-name">팀명</label>
              <div className="relative">
                <input
                  className="w-full rounded-lg bg-[#0f2319] border border-[#2e6b4e] text-white placeholder-[#8dceae]/50 focus:border-[#00e677] focus:ring-1 focus:ring-[#00e677] focus:outline-none h-14 px-4 pl-12 transition-all"
                  id="team-name"
                  name="name"
                  placeholder="예: 선데이 스트라이커즈 FC"
                  type="text"
                  required
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8dceae]">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white text-sm font-bold uppercase tracking-wide" htmlFor="activity-region">활동 지역</label>
              <div className="relative group">
                <select
                  className="w-full appearance-none rounded-lg bg-[#0f2319] border border-[#2e6b4e] text-white focus:border-[#00e677] focus:ring-1 focus:ring-[#00e677] focus:outline-none h-14 px-4 pl-12 pr-10 transition-all cursor-pointer"
                  id="activity-region"
                  name="region"
                >
                  <option className="text-[#8dceae]" disabled value="">
                    도시 또는 지역 선택
                  </option>
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8dceae] group-focus-within:text-[#00e677] transition-colors">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8dceae] pointer-events-none">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-white text-sm font-bold uppercase tracking-wide" htmlFor="home-colors">홈 유니폼 색상</label>
                <div className="flex items-center gap-3 bg-[#0f2319] border border-[#2e6b4e] rounded-lg p-2 h-14">
                  <input
                    className="h-8 w-8 rounded cursor-pointer bg-transparent border-none p-0"
                    id="home-colors"
                    name="home_color"
                    type="color"
                    value={homeColor}
                    onChange={(e) => setHomeColor(e.target.value)}
                  />
                  <span className="text-white text-sm">{homeColor}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-white text-sm font-bold uppercase tracking-wide" htmlFor="est-year">창단 연도</label>
                <input
                  className="w-full rounded-lg bg-[#0f2319] border border-[#2e6b4e] text-white placeholder-[#8dceae]/50 focus:border-[#00e677] focus:ring-1 focus:ring-[#00e677] focus:outline-none h-14 px-4 transition-all"
                  id="est-year"
                  name="established_year"
                  max="2099"
                  min="1900"
                  placeholder="YYYY"
                  type="number"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-400 text-center">{error}</p>
          )}

          <div className="mt-10 pt-6 border-t border-[#2e6b4e] flex flex-col-reverse sm:flex-row justify-between items-center gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full sm:w-auto px-6 py-3 rounded-lg text-[#8dceae] font-medium hover:text-white transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto bg-[#00e677] hover:bg-emerald-400 text-[#0f2319] font-bold text-base px-8 py-3 rounded-lg transition-all shadow-[0_0_15px_rgba(0,230,119,0.3)] hover:shadow-[0_0_25px_rgba(0,230,119,0.5)] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <PlusCircle className="w-5 h-5" />
              {isLoading ? "생성 중..." : "팀 생성"}
            </button>
          </div>
        </form>

        <p className="text-center text-[#8dceae] text-sm">
          이미 존재하는 팀에 가입해야 하나요?{" "}
          <Link href="/teams" className="text-[#00e677] hover:underline">
            팀 찾기
          </Link>
        </p>
      </div>
    </main>
  );
}
