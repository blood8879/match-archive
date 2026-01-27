"use server";

import { createClient } from "@/lib/supabase/server";
import { BADGE_DEFINITIONS } from "@/lib/badge-definitions";
import type { UserBadge, BadgeType } from "@/types/supabase";

/**
 * 사용자의 뱃지 목록 조회
 */
export async function getUserBadges(userId?: string): Promise<UserBadge[]> {
  const supabase = await createClient();

  let targetUserId = userId;

  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    targetUserId = user.id;
  }

  const { data, error } = await supabase
    .from("user_badges")
    .select("*")
    .eq("user_id", targetUserId)
    .order("earned_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch user badges:", error);
    return [];
  }

  return data as UserBadge[];
}

/**
 * 뱃지 목록과 메타데이터 함께 조회
 */
export async function getUserBadgesWithInfo(userId?: string) {
  const badges = await getUserBadges(userId);

  return badges.map(badge => ({
    ...badge,
    info: BADGE_DEFINITIONS[badge.badge_type],
  }));
}

/**
 * 획득 가능한 모든 뱃지 목록 (획득 여부 포함)
 */
export async function getAllBadgesWithStatus(userId?: string) {
  const userBadges = await getUserBadges(userId);
  const earnedBadgeTypes = new Set(userBadges.map(b => b.badge_type));

  return Object.entries(BADGE_DEFINITIONS).map(([type, info]) => ({
    type: type as BadgeType,
    ...info,
    earned: earnedBadgeTypes.has(type as BadgeType),
    earnedAt: userBadges.find(b => b.badge_type === type)?.earned_at,
  }));
}
