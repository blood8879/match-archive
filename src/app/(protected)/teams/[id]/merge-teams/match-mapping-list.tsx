"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  X,
  AlertTriangle,
  Link2,
  Plus,
  SkipForward,
  Loader2,
  Send,
} from "lucide-react";
import Image from "next/image";
import { createTeamMergeRequest } from "@/services/team-merge";
import type {
  TeamSearchResult,
  MatchSearchResult,
  MergeMappingType,
  CreateMergeRequestInput,
} from "@/types/team-merge";

interface MatchMappingListProps {
  teamId: string;
  teamName: string;
  searchResult: TeamSearchResult;
  guestTeamId?: string;
  guestTeamName?: string;
  onReset: () => void;
}

type MappingSelection = {
  type: MergeMappingType;
  existing_match_id?: string;
};

export function MatchMappingList({
  teamId,
  teamName,
  searchResult,
  guestTeamId,
  guestTeamName,
  onReset,
}: MatchMappingListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selections, setSelections] = useState<Record<string, MappingSelection>>(
    () => {
      const initial: Record<string, MappingSelection> = {};
      searchResult.related_matches.forEach((m) => {
        if (m.conflict_type === "no_conflict") {
          initial[m.match.id] = { type: "create_new" };
        } else if (m.conflict_type === "score_match") {
          initial[m.match.id] = {
            type: "link_existing",
            existing_match_id: m.conflicting_match?.id,
          };
        } else if (m.conflict_type === "score_mismatch") {
          initial[m.match.id] = {
            type: "dispute",
            existing_match_id: m.conflicting_match?.id,
          };
        }
      });
      return initial;
    }
  );
  const [error, setError] = useState<string | null>(null);

  const handleSelectionChange = (
    matchId: string,
    type: MergeMappingType,
    existingMatchId?: string
  ) => {
    setSelections((prev) => ({
      ...prev,
      [matchId]: { type, existing_match_id: existingMatchId },
    }));
  };

  const selectedCount = Object.values(selections).filter(
    (s) => s.type !== "skip"
  ).length;
  const disputeCount = Object.values(selections).filter(
    (s) => s.type === "dispute"
  ).length;

  const handleSubmit = () => {
    setError(null);

    if (selectedCount === 0) {
      setError("최소 1개 이상의 경기를 선택해주세요");
      return;
    }

    startTransition(async () => {
      try {
        const mappings: CreateMergeRequestInput["mappings"] = [];

        for (const match of searchResult.related_matches) {
          const selection = selections[match.match.id];
          if (!selection) continue;

          mappings.push({
            source_match_id: match.match.id,
            source_team_id:
              match.source_team === "requester" ? teamId : searchResult.team.id,
            mapping_type: selection.type,
            existing_match_id: selection.existing_match_id,
          });
        }

        const result = await createTeamMergeRequest(teamId, {
          target_team_id: searchResult.team.id,
          guest_team_id: guestTeamId,
          mappings,
        });

        if (!result.success) {
          setError(result.error || "요청 생성에 실패했습니다");
          return;
        }

        router.refresh();
        onReset();
      } catch {
        setError("요청 생성 중 오류가 발생했습니다");
      }
    });
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-white/10">
        <div className="flex items-center gap-3 sm:gap-4">
          {searchResult.team.emblem_url ? (
            <Image
              src={searchResult.team.emblem_url}
              alt={searchResult.team.name}
              width={48}
              height={48}
              className="rounded-xl"
            />
          ) : (
            <div className="w-12 h-12 bg-surface-700 rounded-xl flex items-center justify-center">
              <span className="text-xl font-bold text-white/60">
                {searchResult.team.name.charAt(0)}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg sm:text-xl font-bold text-white truncate">
                {searchResult.team.name}
              </h3>
              {guestTeamName && (
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full border border-purple-500/30 whitespace-nowrap">
                  with {guestTeamName}
                </span>
              )}
            </div>
            <p className="text-text-muted text-sm">
              {searchResult.total_matches}개 경기 발견
              {searchResult.conflicting_matches > 0 && (
                <span className="text-caution ml-2">
                  ({searchResult.conflicting_matches}개 점수 불일치)
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {searchResult.related_matches.map((match) => (
          <MatchMappingCard
            key={match.match.id}
            match={match}
            teamName={guestTeamName || teamName}
            targetTeamName={searchResult.team.name}
            selection={selections[match.match.id]}
            onSelectionChange={(type, existingId) =>
              handleSelectionChange(match.match.id, type, existingId)
            }
          />
        ))}
      </div>

      <div className="p-4 sm:p-6 bg-surface-800/50 border-t border-white/10">
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-text-muted">
            <span className="text-white font-medium">{selectedCount}</span>개 경기 선택됨
            {disputeCount > 0 && (
              <span className="text-caution ml-2">
                ({disputeCount}개 점수 조정 필요)
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onReset}
              disabled={isPending}
              className="px-4 py-2.5 bg-surface-700 hover:bg-surface-600 text-white rounded-xl transition-colors text-sm"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending || selectedCount === 0}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-surface-700 disabled:text-text-muted text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              통합 요청 보내기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MatchMappingCardProps {
  match: MatchSearchResult;
  teamName: string;
  targetTeamName: string;
  selection: MappingSelection | undefined;
  onSelectionChange: (type: MergeMappingType, existingId?: string) => void;
}

function MatchMappingCard({
  match,
  teamName,
  targetTeamName,
  selection,
  onSelectionChange,
}: MatchMappingCardProps) {
  const isRequester = match.source_team === "requester";
  const matchDate = new Date(match.match.match_date);
  const formattedDate = matchDate.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const homeTeam = isRequester ? teamName : targetTeamName;
  const awayTeam = isRequester ? targetTeamName : teamName;

  const getConflictBadge = () => {
    switch (match.conflict_type) {
      case "no_conflict":
        return (
          <span className="px-2 py-1 bg-accent-500/20 text-accent-500 text-xs rounded-lg flex items-center gap-1">
            <Plus className="w-3 h-3" />새 경기
          </span>
        );
      case "score_match":
        return (
          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-lg flex items-center gap-1">
            <Link2 className="w-3 h-3" />
            기존 연결
          </span>
        );
      case "score_mismatch":
        return (
          <span className="px-2 py-1 bg-caution/20 text-caution text-xs rounded-lg flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            점수 불일치
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-text-muted text-xs sm:text-sm">
              {formattedDate}
            </span>
            {match.is_home ? (
              <span className="text-xs text-accent-500">홈</span>
            ) : (
              <span className="text-xs text-blue-400">원정</span>
            )}
            {getConflictBadge()}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base">
            <span className="text-white font-medium truncate max-w-[100px] sm:max-w-none">
              {homeTeam}
            </span>
            <span className="text-lg sm:text-xl font-bold text-white">
              {match.match.home_score}
            </span>
            <span className="text-text-muted">:</span>
            <span className="text-lg sm:text-xl font-bold text-white">
              {match.match.away_score}
            </span>
            <span className="text-white font-medium truncate max-w-[100px] sm:max-w-none">
              {awayTeam}
            </span>
          </div>

          {match.conflict_type === "score_mismatch" && match.conflicting_match && (
            <div className="mt-2 p-2 bg-caution/10 rounded-lg">
              <p className="text-xs text-caution">
                상대팀 기록: {match.conflicting_match.home_score}:
                {match.conflicting_match.away_score}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {match.conflict_type !== "score_mismatch" && (
            <>
              <button
                onClick={() =>
                  onSelectionChange(
                    match.conflict_type === "score_match"
                      ? "link_existing"
                      : "create_new",
                    match.conflicting_match?.id
                  )
                }
                className={`p-2 rounded-lg transition-colors ${
                  selection?.type !== "skip"
                    ? "bg-accent-500/20 text-accent-500"
                    : "bg-surface-700 text-text-muted hover:text-white"
                }`}
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={() => onSelectionChange("skip")}
                className={`p-2 rounded-lg transition-colors ${
                  selection?.type === "skip"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-surface-700 text-text-muted hover:text-white"
                }`}
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </>
          )}
          {match.conflict_type === "score_mismatch" && (
            <>
              <button
                onClick={() =>
                  onSelectionChange("dispute", match.conflicting_match?.id)
                }
                className={`p-2 rounded-lg transition-colors ${
                  selection?.type === "dispute"
                    ? "bg-caution/20 text-caution"
                    : "bg-surface-700 text-text-muted hover:text-white"
                }`}
                title="점수 조정 후 통합"
              >
                <AlertTriangle className="w-5 h-5" />
              </button>
              <button
                onClick={() => onSelectionChange("skip")}
                className={`p-2 rounded-lg transition-colors ${
                  selection?.type === "skip"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-surface-700 text-text-muted hover:text-white"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
