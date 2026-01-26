"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, Check, X, Loader2, Scale } from "lucide-react";
import Image from "next/image";
import { approveTeamMerge, rejectTeamMerge } from "@/services/team-merge";
import type { TeamMergeRequestWithDetails } from "@/types/team-merge";
import { DisputeResolutionModal } from "./dispute-resolution-modal";

interface IncomingRequestsProps {
  requests: TeamMergeRequestWithDetails[];
}

export function IncomingRequests({ requests }: IncomingRequestsProps) {
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6 mt-6 border-l-4 border-blue-500">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <Clock className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">받은 통합 요청</h3>
          <p className="text-text-muted text-sm">
            {requests.length}건의 요청이 대기 중입니다
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {requests.map((request) => (
          <IncomingRequestCard 
            key={request.id} 
            request={request} 
            onOpenDispute={() => setSelectedDisputeId(request.id)}
          />
        ))}
      </div>

      <DisputeResolutionModal
        requestId={selectedDisputeId}
        isOpen={!!selectedDisputeId}
        onClose={() => setSelectedDisputeId(null)}
        onResolved={() => {
          router.refresh();
        }}
        myRole="target"
      />
    </div>
  );
}

interface IncomingRequestCardProps {
  request: TeamMergeRequestWithDetails;
  onOpenDispute: () => void;
}

function IncomingRequestCard({ request, onOpenDispute }: IncomingRequestCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleApprove = () => {
    setError(null);
    startTransition(async () => {
      const result = await approveTeamMerge(request.id);
      if (!result.success) {
        setError(result.error || "승인에 실패했습니다");
        return;
      }
      router.refresh();
    });
  };

  const handleReject = () => {
    setError(null);
    startTransition(async () => {
      const result = await rejectTeamMerge(request.id);
      if (!result.success) {
        setError(result.error || "거절에 실패했습니다");
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

  return (
    <div className="p-4 bg-surface-800/50 rounded-xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {request.requester_team?.emblem_url ? (
            <Image
              src={request.requester_team.emblem_url}
              alt={request.requester_team.name}
              width={40}
              height={40}
              className="rounded-lg shrink-0"
            />
          ) : (
            <div className="w-10 h-10 bg-surface-700 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-white/60">
                {request.requester_team?.name?.charAt(0) || "?"}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-white font-medium truncate">
              {request.requester_team?.name || "알 수 없는 팀"}
            </p>
            <p className="text-text-muted text-xs">{formattedDate}</p>
          </div>
        </div>

        {request.status === "dispute" ? (
          <button
            onClick={onOpenDispute}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 transition-colors rounded-lg group"
          >
            <Scale className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
            <span className="text-purple-400 group-hover:text-purple-300 text-xs font-bold">
              점수 조정
            </span>
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="p-2 bg-accent-500/20 hover:bg-accent-500/30 text-accent-500 rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={handleReject}
              disabled={isPending}
              className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}
    </div>
  );
}
