"use client";

import { useEffect, useState, useTransition } from "react";
import { X, Loader2, Check, AlertTriangle, Scale } from "lucide-react";
import { getMergeRequestDetails, submitDisputeScore } from "@/services/team-merge";
import type { 
  TeamMergeRequestWithDetails, 
  TeamMergeMappingWithDetails, 
  TeamMergeDisputeWithDetails 
} from "@/types/team-merge";

interface DisputeResolutionModalProps {
  requestId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onResolved: () => void;
  myRole: "requester" | "target";
}

export function DisputeResolutionModal({
  requestId,
  isOpen,
  onClose,
  onResolved,
  myRole,
}: DisputeResolutionModalProps) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<{
    request: TeamMergeRequestWithDetails;
    mappings: TeamMergeMappingWithDetails[];
  } | null>(null);

  useEffect(() => {
    if (isOpen && requestId) {
      setLoading(true);
      getMergeRequestDetails(requestId)
        .then((data) => {
          setDetails(data);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setDetails(null);
    }
  }, [isOpen, requestId]);

  if (!isOpen) return null;

  const disputes = details?.mappings.filter(
    (m) => m.mapping_type === "dispute" && m.dispute
  ) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#1a2f25] rounded-2xl border border-[#8eccae]/20 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Scale className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">점수 조정</h2>
              <p className="text-white/50 text-sm">
                양 팀의 기록이 일치하지 않는 경기입니다
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/50">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p>데이터를 불러오는 중...</p>
            </div>
          ) : disputes.length > 0 ? (
            disputes.map((mapping) => (
              <DisputeItem
                key={mapping.id}
                mapping={mapping}
                request={details!.request}
                myRole={myRole}
                onResolved={() => {
                  if (requestId) {
                    getMergeRequestDetails(requestId).then(setDetails);
                  }
                  onResolved();
                }}
              />
            ))
          ) : (
            <div className="text-center py-12 text-white/50">
              조정이 필요한 항목이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface DisputeItemProps {
  mapping: TeamMergeMappingWithDetails;
  request: TeamMergeRequestWithDetails;
  myRole: "requester" | "target";
  onResolved: () => void;
}

function DisputeItem({ mapping, request, myRole, onResolved }: DisputeItemProps) {
  const dispute = mapping.dispute as TeamMergeDisputeWithDetails;
  const [homeScore, setHomeScore] = useState<string>("");
  const [awayScore, setAwayScore] = useState<string>("");
  const [isSubmitting, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const hasISubmitted = myRole === "requester" 
    ? dispute.requester_submitted_home !== null 
    : dispute.target_submitted_home !== null;

  const isRequesterHome = mapping.source_match.is_home ?? true;
  
  const homeTeamName = isRequesterHome ? request.requester_team.name : request.target_team.name;
  const awayTeamName = isRequesterHome ? request.target_team.name : request.requester_team.name;

  const handleSubmit = () => {
    if (!homeScore || !awayScore) return;

    setStatusMessage(null);
    startTransition(async () => {
      const result = await submitDisputeScore(
        dispute.id,
        parseInt(homeScore),
        parseInt(awayScore)
      );

      if (result.success) {
        if (result.resolved) {
          setStatusMessage({ type: "success", text: "점수 조정이 완료되었습니다." });
          onResolved();
        } else if (result.waiting_for === "score_mismatch") {
          setStatusMessage({ 
            type: "error", 
            text: "상대팀과 제출한 점수가 일치하지 않습니다. 확인 후 다시 제출해주세요." 
          });
        } else {
          setStatusMessage({ 
            type: "info", 
            text: "제출되었습니다. 상대팀의 입력을 기다리는 중입니다." 
          });
        }
      } else {
        setStatusMessage({ 
          type: "error", 
          text: result.error || "제출에 실패했습니다." 
        });
      }
    });
  };

  const matchDate = new Date(mapping.source_match.match_date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-black/20 rounded-xl p-5 border border-white/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-purple-300 font-medium">
          <ClockIcon className="w-4 h-4" />
          {matchDate}
        </div>
        {dispute.status === "resolved" ? (
           <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-md font-medium flex items-center gap-1">
             <Check className="w-3 h-3" /> 해결됨
           </span>
        ) : (
          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-md font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> 조정 중
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div className="space-y-2">
          <p className="text-white/50 text-xs mb-1">
            {request.requester_team.name} 기록
          </p>
          <div className="bg-white/5 p-3 rounded-lg text-center">
            <div className="text-lg font-bold text-white mb-1">
              {dispute.requester_home_score} : {dispute.requester_away_score}
            </div>
            <div className="text-xs text-white/40">
              (홈 : 원정)
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-white/50 text-xs mb-1">
            {request.target_team.name} 기록
          </p>
          <div className="bg-white/5 p-3 rounded-lg text-center">
            {dispute.target_home_score !== null ? (
              <>
                <div className="text-lg font-bold text-white mb-1">
                  {dispute.target_home_score} : {dispute.target_away_score}
                </div>
                <div className="text-xs text-white/40">
                  (홈 : 원정)
                </div>
              </>
            ) : (
              <div className="text-white/30 italic py-2">기록 없음</div>
            )}
          </div>
        </div>
      </div>

      {!hasISubmitted && dispute.status !== "resolved" ? (
        <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
          <p className="text-purple-300 text-sm font-medium mb-3">
            올바른 점수를 입력해주세요
          </p>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-xs text-white/60 mb-1.5 truncate">
                {homeTeamName} (홈)
              </label>
              <input
                type="number"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="0"
              />
            </div>
            <span className="text-white/30 font-bold mt-5">:</span>
            <div className="flex-1">
              <label className="block text-xs text-white/60 mb-1.5 truncate">
                {awayTeamName} (원정)
              </label>
              <input
                type="number"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-center focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="0"
              />
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !homeScore || !awayScore}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            점수 제출
          </button>
        </div>
      ) : (
        <div className="bg-white/5 rounded-xl p-4 text-center">
          {dispute.status === "resolved" ? (
             <p className="text-green-400 text-sm">
               조정이 완료되었습니다. (최종 {dispute.resolved_home_score}:{dispute.resolved_away_score})
             </p>
          ) : hasISubmitted ? (
            <div className="space-y-1">
              <p className="text-white text-sm font-medium">제출 완료</p>
              <p className="text-white/50 text-xs">
                {myRole === "requester" && dispute.target_submitted_home === null 
                  ? "상대팀의 입력을 기다리고 있습니다." 
                  : myRole === "target" && dispute.requester_submitted_home === null
                  ? "상대팀의 입력을 기다리고 있습니다."
                  : "상대팀과 점수가 일치하지 않습니다. 다시 확인해주세요."}
              </p>
              <div className="mt-2 text-xs text-white/40">
                내 제출: {myRole === "requester" ? dispute.requester_submitted_home : dispute.target_submitted_home} : {myRole === "requester" ? dispute.requester_submitted_away : dispute.target_submitted_away}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {statusMessage && (
        <div className={`mt-3 p-3 rounded-lg text-sm flex items-start gap-2 ${
          statusMessage.type === "success" ? "bg-green-500/10 text-green-400" :
          statusMessage.type === "error" ? "bg-red-500/10 text-red-400" :
          "bg-blue-500/10 text-blue-400"
        }`}>
          {statusMessage.type === "success" && <Check className="w-4 h-4 shrink-0 mt-0.5" />}
          {statusMessage.type === "error" && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
          {statusMessage.text}
        </div>
      )}
    </div>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
