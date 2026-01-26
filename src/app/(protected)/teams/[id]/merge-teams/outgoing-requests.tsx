"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, X, Loader2, AlertTriangle, Check, Clock } from "lucide-react";
import Image from "next/image";
import { cancelTeamMerge } from "@/services/team-merge";
import type { TeamMergeRequestWithDetails } from "@/types/team-merge";

interface OutgoingRequestsProps {
  requests: TeamMergeRequestWithDetails[];
}

export function OutgoingRequests({ requests }: OutgoingRequestsProps) {
  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6 mt-6 border-l-4 border-orange-500">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-orange-500/20 rounded-lg">
          <Send className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">보낸 통합 요청</h3>
          <p className="text-text-muted text-sm">
            {requests.length}건의 요청이 대기 중입니다
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {requests.map((request) => (
          <OutgoingRequestCard key={request.id} request={request} />
        ))}
      </div>
    </div>
  );
}

interface OutgoingRequestCardProps {
  request: TeamMergeRequestWithDetails;
}

function OutgoingRequestCard({ request }: OutgoingRequestCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleCancel = () => {
    setError(null);
    startTransition(async () => {
      const result = await cancelTeamMerge(request.id);
      if (!result.success) {
        setError(result.error || "취소에 실패했습니다");
        return;
      }
      router.refresh();
    });
  };

  const createdAt = new Date(request.created_at);
  const formattedDate = createdAt.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });

  const getStatusBadge = () => {
    switch (request.status) {
      case "pending":
        return (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/20 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-blue-400 text-xs font-medium">대기 중</span>
          </div>
        );
      case "dispute":
        return (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-caution/20 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 text-caution" />
            <span className="text-caution text-xs font-medium">점수 조정 중</span>
          </div>
        );
      case "approved":
        return (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-accent-500/20 rounded-lg">
            <Check className="w-3.5 h-3.5 text-accent-500" />
            <span className="text-accent-500 text-xs font-medium">승인됨</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 bg-surface-800/50 rounded-xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {request.target_team?.emblem_url ? (
            <Image
              src={request.target_team.emblem_url}
              alt={request.target_team.name}
              width={40}
              height={40}
              className="rounded-lg shrink-0"
            />
          ) : (
            <div className="w-10 h-10 bg-surface-700 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-white/60">
                {request.target_team?.name?.charAt(0) || "?"}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-white font-medium truncate">
              {request.target_team?.name || "알 수 없는 팀"}
            </p>
            <p className="text-text-muted text-xs">{formattedDate}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {(request.status === "pending" || request.status === "dispute") && (
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="p-2 bg-surface-700 hover:bg-surface-600 text-text-muted hover:text-white rounded-lg transition-colors disabled:opacity-50"
              title="요청 취소"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}
    </div>
  );
}
