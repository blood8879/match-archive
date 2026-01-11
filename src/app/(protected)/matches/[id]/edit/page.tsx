"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { updateMatch, getMatchById } from "@/services/matches";
import { getTeamVenues } from "@/services/venues";
import { Calendar, MapPin, Users, Save, ArrowLeft, Building2 } from "lucide-react";
import type { Venue, Match } from "@/types/supabase";

export default function EditMatchPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<string>("");
  const [useCustomLocation, setUseCustomLocation] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const matchData = await getMatchById(matchId);
        if (!matchData) {
          router.push("/matches");
          return;
        }
        setMatch(matchData);

        const teamVenues = await getTeamVenues(matchData.team_id);
        setVenues(teamVenues);

        if (matchData.venue_id) {
          setSelectedVenue(matchData.venue_id);
          setUseCustomLocation(false);
        } else if (matchData.location) {
          setUseCustomLocation(true);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Failed to load match:", err);
        setError("경기 정보를 불러오는데 실패했습니다");
        setIsLoading(false);
      }
    }
    loadData();
  }, [matchId, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const formData = new FormData(e.currentTarget);

      // Set venue_id if selected, otherwise use custom location
      if (!useCustomLocation && selectedVenue) {
        formData.set("venue_id", selectedVenue);
      }

      await updateMatch(matchId, formData);
      router.push(`/matches/${matchId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "경기 수정에 실패했습니다");
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center py-8">
        <div className="text-white">로딩 중...</div>
      </main>
    );
  }

  if (!match) {
    return null;
  }

  return (
    <main className="flex-1 flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-[800px] flex flex-col gap-8">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="text-gray-400 hover:text-[#00e677] transition-colors">홈</Link>
          <span className="text-gray-600">/</span>
          <Link href="/matches" className="text-gray-400 hover:text-[#00e677] transition-colors">경기</Link>
          <span className="text-gray-600">/</span>
          <Link href={`/matches/${matchId}`} className="text-gray-400 hover:text-[#00e677] transition-colors">경기 상세</Link>
          <span className="text-gray-600">/</span>
          <span className="text-[#00e677] font-medium">수정</span>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">경기 수정</h1>
          <p className="text-gray-400 text-lg font-light">경기 정보를 수정합니다.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8 bg-[#183527]/30 rounded-2xl p-6 md:p-8 border border-[#2f6a4d]/50 shadow-xl">
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-[#2f6a4d] pb-2 mb-4">
              <Calendar className="w-5 h-5 text-[#00e677]" />
              <h3 className="text-white font-semibold text-lg">기본 정보</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col gap-2 group">
                <span className="text-gray-300 text-sm font-medium group-focus-within:text-[#00e677] transition-colors">경기 일시</span>
                <div className="relative">
                  <input
                    name="match_date"
                    type="datetime-local"
                    required
                    defaultValue={match.match_date ? new Date(match.match_date).toISOString().slice(0, 16) : ""}
                    className="w-full bg-[#183527] border border-[#2f6a4d] rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#00e677] focus:ring-1 focus:ring-[#00e677] transition-all appearance-none"
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none group-focus-within:text-[#00e677] transition-colors" />
                </div>
              </label>

              <div className="flex flex-col gap-2">
                <span className="text-gray-300 text-sm font-medium">쿼터 수</span>
                <select
                  name="quarters"
                  defaultValue={match.quarters?.toString() || "4"}
                  className="w-full bg-[#183527] border border-[#2f6a4d] rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#00e677] focus:ring-1 focus:ring-[#00e677] transition-all appearance-none"
                >
                  <option value="2">2쿼터</option>
                  <option value="4">4쿼터</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm font-medium">경기장 선택</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={useCustomLocation}
                      onChange={(e) => setUseCustomLocation(e.target.checked)}
                      className="w-4 h-4 bg-[#183527] border border-[#2f6a4d] rounded focus:outline-none focus:ring-2 focus:ring-[#00e677] checked:bg-[#00e677] checked:border-[#00e677] transition-colors"
                    />
                    <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">
                      직접 입력
                    </span>
                  </label>
                </div>
              </div>

              {!useCustomLocation ? (
                venues.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {venues.map((venue) => (
                      <label
                        key={venue.id}
                        className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
                          selectedVenue === venue.id
                            ? "border-[#00e677] bg-[#00e677]/10"
                            : "border-[#2f6a4d] bg-[#183527] hover:border-[#2f6a4d]/80"
                        }`}
                      >
                        <input
                          type="radio"
                          name="venue"
                          value={venue.id}
                          checked={selectedVenue === venue.id}
                          onChange={(e) => setSelectedVenue(e.target.value)}
                          className="sr-only"
                        />
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-white font-semibold">{venue.name}</p>
                              {venue.is_primary && (
                                <span className="text-xs bg-[#00e677]/20 text-[#00e677] px-2 py-0.5 rounded-full">
                                  기본
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">{venue.address}</p>
                            {venue.address_detail && (
                              <p className="text-sm text-gray-500">{venue.address_detail}</p>
                            )}
                          </div>
                          <MapPin
                            className={`w-5 h-5 ${
                              selectedVenue === venue.id ? "text-[#00e677]" : "text-gray-500"
                            }`}
                          />
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#183527] border border-[#2f6a4d] rounded-xl p-8 text-center">
                    <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 mb-4">등록된 경기장이 없습니다</p>
                  </div>
                )
              ) : (
                <div className="relative">
                  <input
                    name="location"
                    type="text"
                    placeholder="경기장 이름 또는 주소 입력"
                    defaultValue={match.location || ""}
                    className="w-full bg-[#183527] border border-[#2f6a4d] rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#00e677] focus:ring-1 focus:ring-[#00e677] transition-all"
                  />
                  <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#2f6a4d] pb-2 mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#00e677]" />
                <h3 className="text-white font-semibold text-lg">상대팀 정보</h3>
              </div>
            </div>
            <label className="flex flex-col gap-2 group">
              <span className="text-gray-300 text-sm font-medium group-focus-within:text-[#00e677] transition-colors">상대팀 이름</span>
              <input
                name="opponent_name"
                type="text"
                placeholder="상대팀 이름"
                defaultValue={match.opponent_name || ""}
                required
                className="w-full bg-[#183527] border border-[#2f6a4d] rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#00e677] focus:ring-1 focus:ring-[#00e677] transition-all"
              />
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <div className="flex flex-col-reverse md:flex-row items-center justify-end gap-4 pt-4 border-t border-[#2f6a4d]/50 mt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full md:w-auto px-8 py-3.5 rounded-xl text-gray-300 font-medium hover:text-white hover:bg-[#183527] transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-[#00e677] text-[#0f2319] font-bold hover:bg-[#05c96b] hover:shadow-[0_0_20px_rgba(6,224,118,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {isSaving ? "저장 중..." : "변경사항 저장"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
