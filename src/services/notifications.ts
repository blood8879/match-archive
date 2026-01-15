"use server";

import { createClient } from "@/lib/supabase/server";
import type { NotificationWithDetails } from "@/types/supabase";

/**
 * 사용자의 알림 목록 조회
 */
export async function getNotifications(options?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<NotificationWithDetails[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  let query = supabase
    .from("notifications")
    .select(`
      *,
      team:related_team_id (id, name, emblem_url)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (options?.unreadOnly) {
    query = query.eq("is_read", false);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch notifications:", error);
    return [];
  }

  return data as NotificationWithDetails[];
}

/**
 * 읽지 않은 알림 개수 조회
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error("Failed to count unread notifications:", error);
    return 0;
  }

  return count ?? 0;
}

/**
 * 알림 읽음 처리
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다");
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to mark notification as read:", error);
    throw new Error("알림 읽음 처리에 실패했습니다");
  }

  return true;
}

/**
 * 모든 알림 읽음 처리
 */
export async function markAllNotificationsAsRead(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다");
  }

  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("is_read", false)
    .select();

  if (error) {
    console.error("Failed to mark all notifications as read:", error);
    throw new Error("알림 읽음 처리에 실패했습니다");
  }

  return data?.length ?? 0;
}

/**
 * 알림 삭제
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다");
  }

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to delete notification:", error);
    throw new Error("알림 삭제에 실패했습니다");
  }

  return true;
}

/**
 * 읽은 알림 모두 삭제
 */
export async function deleteReadNotifications(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다");
  }

  const { data, error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", user.id)
    .eq("is_read", true)
    .select();

  if (error) {
    console.error("Failed to delete read notifications:", error);
    throw new Error("읽은 알림 삭제에 실패했습니다");
  }

  return data?.length ?? 0;
}

/**
 * 특정 관련 엔티티의 알림 삭제 (초대/병합 처리 후 해당 알림 정리)
 */
export async function deleteNotificationByRelation(options: {
  inviteId?: string;
  mergeRequestId?: string;
}): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return;

  if (options.inviteId) {
    await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id)
      .eq("related_invite_id", options.inviteId);
  }

  if (options.mergeRequestId) {
    await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id)
      .eq("related_merge_request_id", options.mergeRequestId);
  }
}
