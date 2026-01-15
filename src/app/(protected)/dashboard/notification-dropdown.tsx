"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, GitMerge, Mail, Check, X, Loader2, CheckCheck, Trash2 } from "lucide-react";
import type { NotificationWithDetails, NotificationType } from "@/types/supabase";
import { acceptTeamInvite, rejectTeamInvite } from "@/services/invites";
import { acceptMergeRequest, rejectMergeRequest } from "@/services/record-merge";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "@/services/notifications";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { AlertModal, type AlertType } from "@/components/ui/alert-modal";

interface NotificationDropdownProps {
  notifications: NotificationWithDetails[];
}

const notificationIcons: Record<NotificationType, { icon: typeof Bell; color: string; bg: string }> = {
  team_invite: { icon: Mail, color: "text-[#FFC400]", bg: "bg-[#FFC400]/20" },
  merge_request: { icon: GitMerge, color: "text-purple-400", bg: "bg-purple-500/20" },
  invite_accepted: { icon: Check, color: "text-green-400", bg: "bg-green-500/20" },
  invite_rejected: { icon: X, color: "text-red-400", bg: "bg-red-500/20" },
  merge_accepted: { icon: Check, color: "text-purple-400", bg: "bg-purple-500/20" },
  merge_rejected: { icon: X, color: "text-red-400", bg: "bg-red-500/20" },
  team_joined: { icon: Bell, color: "text-green-400", bg: "bg-green-500/20" },
  match_created: { icon: Bell, color: "text-blue-400", bg: "bg-blue-500/20" },
  match_reminder: { icon: Bell, color: "text-orange-400", bg: "bg-orange-500/20" },
};

export function NotificationDropdown({
  notifications,
}: NotificationDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"accept" | "reject" | "read" | "delete" | null>(null);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    type: AlertType;
    title?: string;
    message: string;
  }>({ type: "info", message: "" });

  const showModal = (type: AlertType, message: string, title?: string) => {
    setModalConfig({ type, title, message });
    setModalOpen(true);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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

  const handleAcceptInvite = async (notification: NotificationWithDetails) => {
    if (!notification.related_invite_id) return;

    setLoadingId(notification.id);
    setActionType("accept");

    try {
      await acceptTeamInvite(notification.related_invite_id);
      await markNotificationAsRead(notification.id);
      router.refresh();
    } catch (error) {
      showModal("error", error instanceof Error ? error.message : "수락에 실패했습니다");
    } finally {
      setLoadingId(null);
      setActionType(null);
    }
  };

  const handleRejectInvite = async (notification: NotificationWithDetails) => {
    if (!notification.related_invite_id) return;

    setLoadingId(notification.id);
    setActionType("reject");

    try {
      await rejectTeamInvite(notification.related_invite_id);
      await markNotificationAsRead(notification.id);
      router.refresh();
    } catch (error) {
      showModal("error", error instanceof Error ? error.message : "거절에 실패했습니다");
    } finally {
      setLoadingId(null);
      setActionType(null);
    }
  };

  const handleAcceptMerge = async (notification: NotificationWithDetails) => {
    if (!notification.related_merge_request_id) return;

    setLoadingId(notification.id);
    setActionType("accept");

    try {
      const response = await acceptMergeRequest(notification.related_merge_request_id);
      await markNotificationAsRead(notification.id);
      showModal(
        "success",
        `기록 병합이 완료되었습니다!\n- ${response.recordsUpdated || 0}개의 경기 기록이 통합되었습니다.`,
        "완료"
      );
      router.refresh();
    } catch (error) {
      showModal("error", error instanceof Error ? error.message : "병합에 실패했습니다");
    } finally {
      setLoadingId(null);
      setActionType(null);
    }
  };

  const handleRejectMerge = async (notification: NotificationWithDetails) => {
    if (!notification.related_merge_request_id) return;

    setLoadingId(notification.id);
    setActionType("reject");

    try {
      await rejectMergeRequest(notification.related_merge_request_id);
      await markNotificationAsRead(notification.id);
      router.refresh();
    } catch (error) {
      showModal("error", error instanceof Error ? error.message : "거절에 실패했습니다");
    } finally {
      setLoadingId(null);
      setActionType(null);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    setLoadingId(notificationId);
    setActionType("read");

    try {
      await markNotificationAsRead(notificationId);
      router.refresh();
    } catch (error) {
      console.error("Failed to mark as read:", error);
    } finally {
      setLoadingId(null);
      setActionType(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    startTransition(async () => {
      try {
        await markAllNotificationsAsRead();
        router.refresh();
      } catch (error) {
        console.error("Failed to mark all as read:", error);
      }
    });
  };

  const handleDelete = async (notificationId: string) => {
    setLoadingId(notificationId);
    setActionType("delete");

    try {
      await deleteNotification(notificationId);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete notification:", error);
    } finally {
      setLoadingId(null);
      setActionType(null);
    }
  };

  const renderNotificationContent = (notification: NotificationWithDetails) => {
    const { type } = notification;
    const iconConfig = notificationIcons[type] || notificationIcons.team_invite;
    const Icon = iconConfig.icon;

    // 액션이 필요한 알림인지 확인
    const isActionable = type === "team_invite" || type === "merge_request";

    return (
      <div
        key={notification.id}
        className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${
          !notification.is_read ? "bg-white/[0.02]" : ""
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 ${iconConfig.bg} rounded-lg shrink-0`}>
            <Icon className={`w-4 h-4 ${iconConfig.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-white font-medium truncate">
                {notification.title}
              </p>
              {!notification.is_read && (
                <span className="w-2 h-2 bg-[#00e677] rounded-full shrink-0 mt-1.5" />
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {notification.message}
            </p>
            <p className="text-xs text-text-muted/60 mt-1">
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
                locale: ko,
              })}
            </p>

            {/* 액션 버튼 - 팀 초대 */}
            {type === "team_invite" && notification.related_invite_id && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleAcceptInvite(notification)}
                  disabled={loadingId === notification.id}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-constructive/20 text-constructive hover:bg-constructive/30 disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  {loadingId === notification.id && actionType === "accept" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                  수락
                </button>
                <button
                  onClick={() => handleRejectInvite(notification)}
                  disabled={loadingId === notification.id}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  {loadingId === notification.id && actionType === "reject" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <X className="w-3 h-3" />
                  )}
                  거절
                </button>
              </div>
            )}

            {/* 액션 버튼 - 기록 병합 */}
            {type === "merge_request" && notification.related_merge_request_id && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleAcceptMerge(notification)}
                  disabled={loadingId === notification.id}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  {loadingId === notification.id && actionType === "accept" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                  수락
                </button>
                <button
                  onClick={() => handleRejectMerge(notification)}
                  disabled={loadingId === notification.id}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  {loadingId === notification.id && actionType === "reject" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <X className="w-3 h-3" />
                  )}
                  거절
                </button>
              </div>
            )}

            {/* 일반 알림 액션 버튼 (읽음 처리, 삭제) */}
            {!isActionable && (
              <div className="flex gap-2 mt-2">
                {!notification.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    disabled={loadingId === notification.id}
                    className="px-2 py-1 text-xs text-text-muted hover:text-white transition-colors flex items-center gap-1"
                  >
                    {loadingId === notification.id && actionType === "read" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    읽음
                  </button>
                )}
                <button
                  onClick={() => handleDelete(notification.id)}
                  disabled={loadingId === notification.id}
                  className="px-2 py-1 text-xs text-text-muted hover:text-destructive transition-colors flex items-center gap-1"
                >
                  {loadingId === notification.id && actionType === "delete" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                  삭제
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 rounded-full text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center ring-2 ring-[#0f2319]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-white">알림</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <>
                    <span className="text-xs text-text-muted">{unreadCount}개의 새 알림</span>
                    <button
                      onClick={handleMarkAllAsRead}
                      disabled={isPending}
                      className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                      title="모두 읽음 처리"
                    >
                      {isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCheck className="w-4 h-4" />
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="w-10 h-10 text-text-muted mx-auto mb-3" />
                  <p className="text-text-muted text-sm">새로운 알림이 없습니다</p>
                </div>
              ) : (
                notifications.map(renderNotificationContent)
              )}
            </div>
          </div>
        )}
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
      />
    </>
  );
}
