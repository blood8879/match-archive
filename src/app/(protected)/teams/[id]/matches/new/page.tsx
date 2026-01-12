"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createMatch } from "@/services/matches";
import { getTeamVenues } from "@/services/venues";
import { getTeams } from "@/services/teams";
import { getGuestTeams, createGuestTeam, type GuestTeam } from "@/services/guest-teams";
import { Calendar, MapPin, Users, FileText, PlusCircle, Search, Building2, X } from "lucide-react";
import type { Venue, Team } from "@/types/supabase";

export default function NewMatchPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchType, setMatchType] = useState("friendly");
  const [unknownOpponent, setUnknownOpponent] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<string>("");
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Team[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState<string>("");
  const [opponentTab, setOpponentTab] = useState<"registered" | "guest" | "manual">("registered");
  const [guestTeams, setGuestTeams] = useState<GuestTeam[]>([]);
  const [selectedGuestTeam, setSelectedGuestTeam] = useState<string>("");
  const [showGuestTeamForm, setShowGuestTeamForm] = useState(false);
  const [isCreatingGuestTeam, setIsCreatingGuestTeam] = useState(false);

  useEffect(() => {
    async function loadVenues() {
      try {
        const teamVenues = await getTeamVenues(teamId);
        setVenues(teamVenues);

        // Set primary venue as default
        const primaryVenue = teamVenues.find(v => v.is_primary);
        if (primaryVenue) {
          setSelectedVenue(primaryVenue.id);
        }
      } catch (err) {
        console.error("Failed to load venues:", err);
      }
    }
    loadVenues();
  }, [teamId]);

  // Load guest teams
  useEffect(() => {
    async function loadGuestTeams() {
      try {
        const teams = await getGuestTeams(teamId);
        setGuestTeams(teams);
      } catch (err) {
        console.error("Failed to load guest teams:", err);
      }
    }
    loadGuestTeams();
  }, [teamId]);

  // Debounced search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await getTeams(undefined, searchQuery);
        // 자기 팀은 제외
        setSearchResults(results.filter((team) => team.id !== teamId));
      } catch (err) {
        console.error("Failed to search teams:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, teamId]);

  const handleCreateGuestTeam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreatingGuestTeam(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const newGuestTeam = await createGuestTeam(teamId, formData);

      // Reload guest teams
      const teams = await getGuestTeams(teamId);
      setGuestTeams(teams);

      // Select the newly created guest team
      setSelectedGuestTeam(newGuestTeam.id);
      setShowGuestTeamForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "게스트팀 생성에 실패했습니다");
    } finally {
      setIsCreatingGuestTeam(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      formData.set("team_id", teamId);

      // Set opponent based on selected tab
      if (opponentTab === "registered" && selectedOpponent) {
        const opponent = searchResults.find((t) => t.id === selectedOpponent);
        if (opponent) {
          formData.set("opponent_name", opponent.name);
          formData.set("opponent_team_id", opponent.id);
        }
      } else if (opponentTab === "guest" && selectedGuestTeam) {
        const guestTeam = guestTeams.find((t) => t.id === selectedGuestTeam);
        if (guestTeam) {
          formData.set("opponent_name", guestTeam.name);
          formData.set("opponent_team_id", guestTeam.id);
          formData.set("is_guest_opponent", "true");
        }
      }
      // For manual tab, opponent_name will be taken from the input field

      // Set venue_id if selected, otherwise use custom location
      if (!useCustomLocation && selectedVenue) {
        formData.set("venue_id", selectedVenue);
      }

      const match = await createMatch(formData);
      router.push(`/matches/${match.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "경기 생성에 실패했습니다");
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-[800px] flex flex-col gap-8">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="text-gray-400 hover:text-[#00e677] transition-colors">홈</Link>
          <span className="text-gray-600">/</span>
          <Link href={`/teams/${teamId}`} className="text-gray-400 hover:text-[#00e677] transition-colors">팀</Link>
          <span className="text-gray-600">/</span>
          <span className="text-[#00e677] font-medium">경기 생성</span>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">경기 생성</h1>
          <p className="text-gray-400 text-lg font-light">새로운 매치 일정을 기록하고 팀원들에게 알립니다.</p>
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
                    className="w-full bg-[#183527] border border-[#2f6a4d] rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#00e677] focus:ring-1 focus:ring-[#00e677] transition-all appearance-none"
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none group-focus-within:text-[#00e677] transition-colors" />
                </div>
              </label>

              <div className="flex flex-col gap-2">
                <span className="text-gray-300 text-sm font-medium">경기 유형</span>
                <div className="grid grid-cols-3 gap-2 h-[54px]">
                  {[
                    { value: "friendly", label: "친선" },
                    { value: "league", label: "리그" },
                    { value: "tournament", label: "토너먼트" },
                  ].map((type) => (
                    <label key={type.value} className="cursor-pointer relative">
                      <input
                        type="radio"
                        name="match_type"
                        value={type.value}
                        checked={matchType === type.value}
                        onChange={(e) => setMatchType(e.target.value)}
                        className="peer sr-only"
                      />
                      <div className="h-full flex items-center justify-center rounded-xl border border-[#2f6a4d] bg-[#183527] text-gray-400 peer-checked:bg-[#00e677]/20 peer-checked:text-[#00e677] peer-checked:border-[#00e677] transition-all hover:bg-[#183527]/80 text-sm font-medium">
                        {type.label}
                      </div>
                    </label>
                  ))}
                </div>
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
                  {venues.length === 0 && !useCustomLocation && (
                    <Link
                      href={`/teams/${teamId}/venues`}
                      className="text-sm text-[#00e677] hover:underline flex items-center gap-1"
                    >
                      <Building2 className="w-4 h-4" />
                      경기장 등록
                    </Link>
                  )}
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
                    <Link
                      href={`/teams/${teamId}/venues`}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#00e677] text-[#0f2319] font-bold hover:bg-[#05c96b] transition-all"
                    >
                      <Building2 className="w-4 h-4" />
                      경기장 등록하기
                    </Link>
                  </div>
                )
              ) : (
                <div className="relative">
                  <input
                    name="location"
                    type="text"
                    placeholder="경기장 이름 또는 주소 입력"
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
              <label className="flex items-center gap-3 cursor-pointer group">
                <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">상대팀 미정</span>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={unknownOpponent}
                    onChange={(e) => setUnknownOpponent(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#183527] border border-[#2f6a4d] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#00e677] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00e677] peer-checked:after:bg-white peer-checked:border-[#00e677]"></div>
                </div>
              </label>
            </div>
            {!unknownOpponent && (
              <div className="space-y-4">
                {/* Tab buttons */}
                <div className="grid grid-cols-3 gap-2 p-1 bg-[#183527]/50 rounded-xl border border-[#2f6a4d]/30">
                  <button
                    type="button"
                    onClick={() => {
                      setOpponentTab("registered");
                      setSelectedGuestTeam("");
                    }}
                    className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
                      opponentTab === "registered"
                        ? "bg-[#00e677] text-[#0f2319]"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    등록된 팀
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpponentTab("guest");
                      setSelectedOpponent("");
                    }}
                    className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
                      opponentTab === "guest"
                        ? "bg-[#00e677] text-[#0f2319]"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    게스트팀
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpponentTab("manual");
                      setSelectedOpponent("");
                      setSelectedGuestTeam("");
                    }}
                    className={`py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
                      opponentTab === "manual"
                        ? "bg-[#00e677] text-[#0f2319]"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    직접 입력
                  </button>
                </div>

                {/* Registered teams tab */}
                {opponentTab === "registered" && (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-gray-300 text-sm font-medium">팀 검색</span>
                      <div className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="팀 이름을 입력하세요..."
                          className="w-full bg-[#183527] border border-[#2f6a4d] rounded-xl px-4 py-3.5 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-[#00e677] focus:ring-1 focus:ring-[#00e677] transition-all"
                        />
                        <Search className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isSearching ? "text-[#00e677] animate-pulse" : "text-gray-500"}`} />
                      </div>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400">검색 결과 ({searchResults.length}개)</p>
                        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                          {searchResults.map((team) => (
                            <label
                              key={team.id}
                              className={`cursor-pointer p-3 rounded-lg border-2 transition-all ${
                                selectedOpponent === team.id
                                  ? "border-[#00e677] bg-[#00e677]/10"
                                  : "border-[#2f6a4d] bg-[#183527] hover:border-[#2f6a4d]/80"
                              }`}
                            >
                              <input
                                type="radio"
                                name="opponent_selection"
                                value={team.id}
                                checked={selectedOpponent === team.id}
                                onChange={(e) => setSelectedOpponent(e.target.value)}
                                className="sr-only"
                              />
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {team.emblem_url ? (
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-[#214a36] flex items-center justify-center flex-shrink-0">
                                      <img
                                        src={team.emblem_url}
                                        alt={`${team.name} 엠블럼`}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-[#214a36] flex items-center justify-center flex-shrink-0">
                                      <span className="text-[#8eccae] font-bold text-lg">
                                        {team.name.charAt(0)}
                                      </span>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-white font-semibold">{team.name}</p>
                                    <p className="text-sm text-gray-400">{team.region || "지역 미상"}</p>
                                  </div>
                                </div>
                                {selectedOpponent === team.id && (
                                  <div className="w-5 h-5 rounded-full bg-[#00e677] flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-[#0f2319]" />
                                  </div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Guest teams tab */}
                {opponentTab === "guest" && (
                  <div className="space-y-4">
                    {guestTeams.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400">게스트팀 목록 ({guestTeams.length}개)</p>
                        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                          {guestTeams.map((team) => (
                            <label
                              key={team.id}
                              className={`cursor-pointer p-3 rounded-lg border-2 transition-all ${
                                selectedGuestTeam === team.id
                                  ? "border-[#00e677] bg-[#00e677]/10"
                                  : "border-[#2f6a4d] bg-[#183527] hover:border-[#2f6a4d]/80"
                              }`}
                            >
                              <input
                                type="radio"
                                name="guest_team_selection"
                                value={team.id}
                                checked={selectedGuestTeam === team.id}
                                onChange={(e) => setSelectedGuestTeam(e.target.value)}
                                className="sr-only"
                              />
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {team.emblem_url ? (
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-[#214a36] flex items-center justify-center flex-shrink-0">
                                      <img
                                        src={team.emblem_url}
                                        alt={`${team.name} 엠블럼`}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-[#214a36] flex items-center justify-center flex-shrink-0">
                                      <span className="text-[#8eccae] font-bold text-lg">
                                        {team.name.charAt(0)}
                                      </span>
                                    </div>
                                  )}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-white font-semibold">{team.name}</p>
                                      <span className="text-xs bg-[#00e677]/20 text-[#00e677] px-2 py-0.5 rounded-full">
                                        게스트
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-400">{team.region || "지역 미상"}</p>
                                  </div>
                                </div>
                                {selectedGuestTeam === team.id && (
                                  <div className="w-5 h-5 rounded-full bg-[#00e677] flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-[#0f2319]" />
                                  </div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#183527] border border-[#2f6a4d] rounded-xl p-6 text-center">
                        <Users className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm mb-3">등록된 게스트팀이 없습니다</p>
                      </div>
                    )}

                    {/* Guest team creation form */}
                    {showGuestTeamForm ? (
                      <form onSubmit={handleCreateGuestTeam} className="bg-[#183527] border border-[#2f6a4d] rounded-xl p-4 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-semibold">새 게스트팀 추가</h4>
                          <button
                            type="button"
                            onClick={() => setShowGuestTeamForm(false)}
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <input
                          name="name"
                          type="text"
                          placeholder="팀 이름 (필수)"
                          required
                          className="w-full bg-[#0f2319] border border-[#2f6a4d] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#00e677] focus:ring-1 focus:ring-[#00e677] transition-all text-sm"
                        />
                        <input
                          name="region"
                          type="text"
                          placeholder="지역 (선택)"
                          className="w-full bg-[#0f2319] border border-[#2f6a4d] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#00e677] focus:ring-1 focus:ring-[#00e677] transition-all text-sm"
                        />
                        <button
                          type="submit"
                          disabled={isCreatingGuestTeam}
                          className="w-full px-4 py-2 rounded-lg bg-[#00e677] text-[#0f2319] font-semibold hover:bg-[#05c96b] transition-all disabled:opacity-50 text-sm"
                        >
                          {isCreatingGuestTeam ? "생성 중..." : "게스트팀 생성"}
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowGuestTeamForm(true)}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#183527] border border-[#2f6a4d] text-[#00e677] font-medium hover:bg-[#214a36] transition-all flex items-center justify-center gap-2"
                      >
                        <PlusCircle className="w-4 h-4" />
                        새 게스트팀 추가
                      </button>
                    )}
                  </div>
                )}

                {/* Manual input tab */}
                {opponentTab === "manual" && (
                  <div className="flex flex-col gap-2">
                    <span className="text-gray-300 text-sm font-medium">상대팀 이름</span>
                    <input
                      name="opponent_name"
                      type="text"
                      placeholder="상대팀 이름을 입력하세요"
                      required={opponentTab === "manual"}
                      className="w-full bg-[#183527] border border-[#2f6a4d] rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#00e677] focus:ring-1 focus:ring-[#00e677] transition-all"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-[#2f6a4d] pb-2 mb-4">
              <FileText className="w-5 h-5 text-[#00e677]" />
              <h3 className="text-white font-semibold text-lg">경기 설정</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <span className="text-gray-300 text-sm font-medium">쿼터 수</span>
                <select
                  name="quarters"
                  defaultValue="4"
                  className="w-full bg-[#183527] border border-[#2f6a4d] rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#00e677] focus:ring-1 focus:ring-[#00e677] transition-all appearance-none"
                >
                  <option value="2">2쿼터</option>
                  <option value="4">4쿼터</option>
                </select>
              </div>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-gray-300 text-sm font-medium">메모</span>
              <textarea
                name="notes"
                placeholder="준비물, 유니폼 색상, 주의사항 등 메모를 입력하세요."
                className="w-full bg-[#183527] border border-[#2f6a4d] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00e677] focus:ring-1 focus:ring-[#00e677] transition-all resize-none min-h-[100px]"
              ></textarea>
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <div className="flex flex-col-reverse md:flex-row items-center justify-end gap-4 pt-4 border-t border-[#2f6a4d]/50 mt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full md:w-auto px-8 py-3.5 rounded-xl text-gray-300 font-medium hover:text-white hover:bg-[#183527] transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-[#00e677] text-[#0f2319] font-bold hover:bg-[#05c96b] hover:shadow-[0_0_20px_rgba(6,224,118,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <PlusCircle className="w-5 h-5" />
              {isLoading ? "생성 중..." : "경기 생성하기"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
