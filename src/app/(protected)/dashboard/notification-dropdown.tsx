"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, GitMerge, Mail, Check, X, Loader2 } from "lucide-react";
import type { TeamInviteWithUsers } from "@/services/invites";
import type { RecordMergeRequestWithDetails } from "@/types/supabase";
import { acceptTeamInvite, rejectTeamInvite } from "@/services/invites";
import { acceptMergeRequest, rejectMergeRequest } from "@/services/record-merge";

interface NotificationDropdownProps {
  invites: TeamInviteWithUsers[];
  mergeRequests: RecordMergeRequestWithDetails[];
}

export function NotificationDropdown({
  invites,
  mergeRequests,
}: NotificationDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"accept" | "reject" | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const totalCount = invites.length + mergeRequests.length;

  // 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAcceptInvite = async (inviteId: string) => {
    setLoadingId(inviteId);
    setActionType("accept");

    try {
      await acceptTeamInvite(inviteId);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "수락에 실패했습니다");
    } finally {
      setLoadingId(null);
      setActionType(null);
    }
  };

  const handleRejectInvite = async (inviteId: string) => {
    setLoadingId(inviteId);
    setActionType("reject");

    try {
      await rejectTeamInvite(inviteId);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "거절에 실패했습니다");
    } finally {
      setLoadingId(null);
      setActionType(null);
    }
  };

  const handleAcceptMerge = async (requestId: string) => {
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
      alert(error instanceof Error ? error.message : "병합에 실패했습니다");
    } finally {
      setLoadingId(null);
      setActionType(null);
    }
  };

  const handleRejectMerge = async (requestId: string) => {
    setLoadingId(requestId);
    setActionType("reject");

    try {
      await rejectMergeRequest(requestId);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "거절에 실패했습니다");
    } finally {
      setLoadingId(null);
      setActionType(null);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-white/70 hover:bg-white/10 hover:text-white transition-colors"
      >
        <Bell className="w-5 h-5" />
        {totalCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center ring-2 ring-[#0f2319]">
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-semibold text-white">알림</h3>
            {totalCount > 0 && (
              <span className="text-xs text-text-muted">{totalCount}개의 새 알림</span>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {totalCount === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-10 h-10 text-text-muted mx-auto mb-3" />
                <p className="text-text-muted text-sm">새로운 알림이 없습니다</p>
              </div>
            ) : (
              <>
                {/* 팀 초대 알림 */}
                {invites.map((invite) => {
                  const teamName = invite.team?.name || "알 수 없는 팀";
                  const inviterName = invite.inviter?.nickname || "알 수 없는 사용자";

                  return (
                    <div
                      key={`invite-${invite.id}`}
                      className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-[#FFC400]/20 rounded-lg shrink-0">
                          <Mail className="w-4 h-4 text-[#FFC400]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">
                            {teamName}
                          </p>
                          <p className="text-xs text-text-muted mt-0.5">
                            {inviterName}님이 팀에 초대했습니다
                          </p>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleAcceptInvite(invite.id)}
                              disabled={loadingId === invite.id}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-constructive/20 text-constructive hover:bg-constructive/30 disabled:opacity-50 transition-colors flex items-center gap-1"
                            >
                              {loadingId === invite.id && actionType === "accept" ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                              수락
                            </button>
                            <button
                              onClick={() => handleRejectInvite(invite.id)}
                              disabled={loadingId === invite.id}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 disabled:opacity-50 transition-colors flex items-center gap-1"
                            >
                              {loadingId === invite.id && actionType === "reject" ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <X className="w-3 h-3" />
                              )}
                              거절
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* 기록 병합 요청 알림 */}
                {mergeRequests.map((request) => {
                  const teamName = request.team?.name || "알 수 없는 팀";
                  const guestName = request.guest_member?.guest_name || "용병";
                  const inviterName = request.inviter?.nickname || "알 수 없는 사용자";

                  return (
                    <div
                      key={`merge-${request.id}`}
                      className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg shrink-0">
                          <GitMerge className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">
                            {teamName} - 기록 병합 요청
                          </p>
                          <p className="text-xs text-text-muted mt-0.5">
                            "{guestName}" 용병 기록을 내 계정에 통합
                          </p>
                          <p className="text-xs text-text-muted">
                            {inviterName}님이 요청
                          </p>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleAcceptMerge(request.id)}
                              disabled={loadingId === request.id}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50 transition-colors flex items-center gap-1"
                            >
                              {loadingId === request.id && actionType === "accept" ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                              수락
                            </button>
                            <button
                              onClick={() => handleRejectMerge(request.id)}
                              disabled={loadingId === request.id}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 disabled:opacity-50 transition-colors flex items-center gap-1"
                            >
                              {loadingId === request.id && actionType === "reject" ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <X className="w-3 h-3" />
                              )}
                              거절
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
