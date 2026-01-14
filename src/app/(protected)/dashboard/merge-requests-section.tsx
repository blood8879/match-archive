"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  acceptMergeRequest,
  rejectMergeRequest,
} from "@/services/record-merge";
import type { RecordMergeRequestWithDetails } from "@/types/supabase";
import { GitMerge, Check, X, Loader2, Zap } from "lucide-react";

interface MergeRequestsSectionProps {
  requests: RecordMergeRequestWithDetails[];
}

export function MergeRequestsSection({ requests }: MergeRequestsSectionProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"accept" | "reject" | null>(null);

  if (requests.length === 0) {
    return null;
  }

  const handleAccept = async (requestId: string) => {
    setLoadingId(requestId);
    setActionType("accept");

    try {
      const response = await acceptMergeRequest(requestId);

      alert(
        `기록 병합이 완료되었습니다!\n` +
        `- ${response.recordsUpdated || 0}개의 경기 기록이 통합되었습니다.`
      );
      router.refresh();
    } catch (error) {
      console.error("Failed to accept merge request:", error);
      alert(
        error instanceof Error
          ? error.message
          : "기록 병합에 실패했습니다"
      );
    } finally {
      setLoadingId(null);
      setActionType(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setLoadingId(requestId);
    setActionType("reject");

    try {
      await rejectMergeRequest(requestId);
      router.refresh();
    } catch (error) {
      console.error("Failed to reject merge request:", error);
      alert(
        error instanceof Error
          ? error.message
          : "거절 처리에 실패했습니다"
      );
    } finally {
      setLoadingId(null);
      setActionType(null);
    }
  };

  return (
    <section className="mb-6">
      <div className="glass-card rounded-2xl p-6 border-2 border-purple-500/30 bg-purple-900/20 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <GitMerge className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              기록 병합 요청 ({requests.length})
            </h2>
            <p className="text-sm text-text-400 mt-0.5">
              용병 기록을 내 계정에 통합할 수 있습니다
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {requests.map((request) => {
            const teamName = request.team?.name || "알 수 없는 팀";
            const guestName = request.guest_member?.guest_name || "용병";
            const inviterName = request.inviter?.nickname || "알 수 없는 사용자";

            return (
              <div
                key={request.id}
                className="p-4 rounded-lg bg-surface-700/50 border border-white/10 hover:border-purple-500/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {request.team?.emblem_url ? (
                        <img
                          src={request.team.emblem_url}
                          alt={teamName}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold">
                          {teamName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-white">{teamName}</p>
                        <p className="text-xs text-text-muted">
                          {inviterName}님이 요청
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-800/50 border border-white/5">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-accent-500" />
                        <span className="text-sm text-white font-medium">
                          "{guestName}" 용병 기록
                        </span>
                      </div>
                      <p className="text-xs text-text-400">
                        수락 시 해당 용병의 경기 기록이 내 계정에 통합되며,
                        <br />
                        <span className="text-purple-400">{teamName}</span>에 자동으로 가입됩니다.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleAccept(request.id)}
                      disabled={loadingId === request.id}
                      className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50 transition-colors font-medium text-sm flex items-center gap-1"
                      title="수락"
                    >
                      {loadingId === request.id && actionType === "accept" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      수락
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      disabled={loadingId === request.id}
                      className="px-4 py-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 disabled:opacity-50 transition-colors font-medium text-sm flex items-center gap-1"
                      title="거절"
                    >
                      {loadingId === request.id && actionType === "reject" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      거절
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
