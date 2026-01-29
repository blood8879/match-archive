"use server";

/**
 * OneSignal Push Notification Service
 * 
 * 팀원들에게 푸시 알림을 전송하는 서버 사이드 서비스
 * OneSignal REST API를 사용하여 external_id(user.id)를 기반으로 알림 전송
 */

import { createClient } from "@/lib/supabase/server";

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
const ONESIGNAL_API_URL = "https://onesignal.com/api/v1/notifications";

export type PushNotificationPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  data?: Record<string, string>;
};

/**
 * OneSignal API 설정 체크
 */
function isOneSignalConfigured(): boolean {
  return !!(
    ONESIGNAL_APP_ID &&
    ONESIGNAL_APP_ID !== "your_onesignal_app_id" &&
    ONESIGNAL_REST_API_KEY &&
    ONESIGNAL_REST_API_KEY !== "your_onesignal_rest_api_key"
  );
}

/**
 * 특정 사용자에게 푸시 알림 전송
 */
export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ success: boolean; error?: string }> {
  if (!isOneSignalConfigured()) {
    console.warn("[Push] OneSignal not configured, skipping push notification");
    return { success: false, error: "OneSignal not configured" };
  }

  try {
    const response = await fetch(ONESIGNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_aliases: {
          external_id: [userId],
        },
        target_channel: "push",
        headings: { en: payload.title, ko: payload.title },
        contents: { en: payload.body, ko: payload.body },
        url: payload.url,
        chrome_web_icon: payload.icon,
        data: payload.data,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[Push] OneSignal API error:", errorData);
      return { success: false, error: errorData.errors?.[0] || "API error" };
    }

    const result = await response.json();
    console.log("[Push] Notification sent:", result.id);
    return { success: true };
  } catch (error) {
    console.error("[Push] Failed to send notification:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * 여러 사용자에게 푸시 알림 전송
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  if (!isOneSignalConfigured()) {
    console.warn("[Push] OneSignal not configured, skipping push notifications");
    return { success: false, sentCount: 0, error: "OneSignal not configured" };
  }

  if (userIds.length === 0) {
    return { success: true, sentCount: 0 };
  }

  try {
    const response = await fetch(ONESIGNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_aliases: {
          external_id: userIds,
        },
        target_channel: "push",
        headings: { en: payload.title, ko: payload.title },
        contents: { en: payload.body, ko: payload.body },
        url: payload.url,
        chrome_web_icon: payload.icon,
        data: payload.data,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[Push] OneSignal API error:", errorData);
      return { success: false, sentCount: 0, error: errorData.errors?.[0] || "API error" };
    }

    const result = await response.json();
    console.log("[Push] Notifications sent:", result.id, "recipients:", result.recipients);
    return { success: true, sentCount: result.recipients || userIds.length };
  } catch (error) {
    console.error("[Push] Failed to send notifications:", error);
    return { success: false, sentCount: 0, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * 팀의 모든 활성 멤버에게 푸시 알림 전송
 * @param teamId - 팀 ID
 * @param payload - 알림 내용
 * @param excludeUserId - 제외할 사용자 ID (예: 알림을 발생시킨 사용자)
 */
export async function sendPushToTeamMembers(
  teamId: string,
  payload: PushNotificationPayload,
  excludeUserId?: string
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  const supabase = await createClient();

  // 팀의 활성 멤버들의 user_id 조회
  const { data: members, error } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("team_id", teamId)
    .eq("status", "active")
    .not("user_id", "is", null);

  if (error) {
    console.error("[Push] Failed to fetch team members:", error);
    return { success: false, sentCount: 0, error: error.message };
  }

  // 중복 제거 및 제외할 사용자 필터링
  const userIds = [...new Set(members.map((m) => m.user_id as string))].filter(
    (id) => id !== excludeUserId
  );

  if (userIds.length === 0) {
    console.log("[Push] No recipients for team:", teamId);
    return { success: true, sentCount: 0 };
  }

  return sendPushToUsers(userIds, payload);
}

/**
 * 경기 생성 알림 전송
 */
export async function sendMatchCreatedNotification(
  teamId: string,
  teamName: string,
  matchId: string,
  matchDate: string,
  opponentName: string,
  creatorUserId: string
): Promise<{ success: boolean; sentCount: number }> {
  const formattedDate = new Date(matchDate).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const payload: PushNotificationPayload = {
    title: `⚽ ${teamName} 새 경기 등록`,
    body: `${formattedDate} vs ${opponentName}`,
    url: `/matches/${matchId}`,
    data: {
      type: "match_created",
      matchId,
      teamId,
    },
  };

  const result = await sendPushToTeamMembers(teamId, payload, creatorUserId);
  
  console.log(`[Push] Match created notification sent to ${result.sentCount} members`);
  return { success: result.success, sentCount: result.sentCount };
}

/**
 * 경기 참석 확인 요청 알림 전송
 */
export async function sendAttendanceReminderNotification(
  teamId: string,
  teamName: string,
  matchId: string,
  matchDate: string,
  opponentName: string
): Promise<{ success: boolean; sentCount: number }> {
  const formattedDate = new Date(matchDate).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  const payload: PushNotificationPayload = {
    title: `📋 ${teamName} 참석 확인 요청`,
    body: `${formattedDate} vs ${opponentName} - 참석 여부를 확인해주세요`,
    url: `/matches/${matchId}`,
    data: {
      type: "attendance_reminder",
      matchId,
      teamId,
    },
  };

  return sendPushToTeamMembers(teamId, payload);
}

/**
 * 팀 초대 알림 전송
 */
export async function sendTeamInviteNotification(
  userId: string,
  teamName: string,
  teamId: string
): Promise<{ success: boolean }> {
  const payload: PushNotificationPayload = {
    title: `🎉 ${teamName}에서 초대가 왔습니다`,
    body: "팀 초대를 확인해주세요",
    url: `/teams/${teamId}`,
    data: {
      type: "team_invite",
      teamId,
    },
  };

  const result = await sendPushToUser(userId, payload);
  return { success: result.success };
}

/**
 * 가입 승인 알림 전송
 */
export async function sendJoinApprovedNotification(
  userId: string,
  teamName: string,
  teamId: string
): Promise<{ success: boolean }> {
  const payload: PushNotificationPayload = {
    title: `✅ ${teamName} 가입 승인`,
    body: "팀 가입이 승인되었습니다!",
    url: `/teams/${teamId}`,
    data: {
      type: "join_approved",
      teamId,
    },
  };

  const result = await sendPushToUser(userId, payload);
  return { success: result.success };
}

/**
 * 경기 변경 알림 전송
 */
export async function sendMatchUpdatedNotification(
  teamId: string,
  teamName: string,
  matchId: string,
  changeDescription: string
): Promise<{ success: boolean; sentCount: number }> {
  const payload: PushNotificationPayload = {
    title: `📢 ${teamName} 경기 일정 변경`,
    body: changeDescription,
    url: `/matches/${matchId}`,
    data: {
      type: "match_updated",
      matchId,
      teamId,
    },
  };

  return sendPushToTeamMembers(teamId, payload);
}
