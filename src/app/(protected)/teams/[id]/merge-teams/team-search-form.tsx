"use client";

import { useState, useTransition, useEffect } from "react";
import { Search, Loader2, AlertCircle, Users } from "lucide-react";
import { searchTeamByCode, findRelatedMatches } from "@/services/team-merge";
import { getGuestTeams, type GuestTeam } from "@/services/guest-teams";
import type { TeamSearchResult } from "@/types/team-merge";
import { MatchMappingList } from "./match-mapping-list";

interface TeamSearchFormProps {
  teamId: string;
  teamName: string;
}

export function TeamSearchForm({ teamId, teamName }: TeamSearchFormProps) {
  const [teamCode, setTeamCode] = useState("");
  const [searchResult, setSearchResult] = useState<TeamSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Guest teams state
  const [guestTeams, setGuestTeams] = useState<GuestTeam[]>([]);
  const [selectedGuestTeamId, setSelectedGuestTeamId] = useState<string>("");
  const [isLoadingGuestTeams, setIsLoadingGuestTeams] = useState(true);

  useEffect(() => {
    const fetchGuestTeams = async () => {
      try {
        const teams = await getGuestTeams(teamId);
        setGuestTeams(teams);
      } catch (error) {
        console.error("Failed to fetch guest teams:", error);
      } finally {
        setIsLoadingGuestTeams(false);
      }
    };

    fetchGuestTeams();
  }, [teamId]);

  const handleSearch = () => {
    if (!teamCode.trim()) {
      setError("팀 코드를 입력해주세요");
      return;
    }

    setError(null);
    setSearchResult(null);

    startTransition(async () => {
      try {
        const team = await searchTeamByCode(teamCode.trim());
        if (!team) {
          setError("해당 코드의 팀을 찾을 수 없습니다");
          return;
        }

        if (team.id === teamId) {
          setError("자신의 팀과는 통합할 수 없습니다");
          return;
        }

        const result = await findRelatedMatches(teamId, team.id, team.name);
        if (!result) {
          setError("경기 기록을 검색하는 중 오류가 발생했습니다");
          return;
        }

        if (result.total_matches === 0) {
          setError(`${team.name}과(와) 관련된 경기 기록이 없습니다`);
          return;
        }

        setSearchResult(result);
      } catch {
        setError("검색 중 오류가 발생했습니다");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-4 sm:p-6">
        <h3 className="text-lg font-bold text-white mb-4">팀 코드로 검색</h3>

        <div className="space-y-4">
          {guestTeams.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm text-text-muted flex items-center gap-2">
                <Users className="w-4 h-4" />
                게스트팀 선택 (선택 사항)
              </label>
              <select
                value={selectedGuestTeamId}
                onChange={(e) => setSelectedGuestTeamId(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-surface-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 text-sm sm:text-base appearance-none cursor-pointer"
                disabled={isPending || isLoadingGuestTeams}
              >
                <option value="">선택 안 함 (직접 통합)</option>
                {guestTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2 sm:gap-3">
            <input
              type="text"
              value={teamCode}
              onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
              placeholder="팀 코드 입력 (예: ABC123)"
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-surface-800 border border-white/10 rounded-xl text-white placeholder:text-text-muted focus:outline-none focus:border-purple-500/50 text-sm sm:text-base"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              disabled={isPending}
            />
            <button
              onClick={handleSearch}
              disabled={isPending || !teamCode.trim()}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-surface-700 disabled:text-text-muted text-white font-medium rounded-xl transition-colors flex items-center gap-2 text-sm sm:text-base"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : (
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
              <span className="hidden sm:inline">검색</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 sm:p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>

      {searchResult && (
        <MatchMappingList
          teamId={teamId}
          teamName={teamName}
          searchResult={searchResult}
          guestTeamId={selectedGuestTeamId || undefined}
          guestTeamName={guestTeams.find(t => t.id === selectedGuestTeamId)?.name}
          onReset={() => {
            setSearchResult(null);
            setTeamCode("");
          }}
        />
      )}
    </div>
  );
}
