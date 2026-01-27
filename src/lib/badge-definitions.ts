import type { BadgeType } from "@/types/supabase";

// 뱃지 메타데이터 정의
export const BADGE_DEFINITIONS: Record<BadgeType, {
  name: string;
  description: string;
  icon: string;
  color: string;
}> = {
  first_goal: {
    name: "첫 골",
    description: "첫 번째 골을 기록했습니다",
    icon: "⚽",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  first_assist: {
    name: "첫 어시스트",
    description: "첫 번째 어시스트를 기록했습니다",
    icon: "🎯",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  first_mom: {
    name: "첫 MOM",
    description: "처음으로 경기 MVP로 선정되었습니다",
    icon: "⭐",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  streak_5: {
    name: "5연속 출석",
    description: "5경기 연속 참석했습니다",
    icon: "🔥",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  streak_10: {
    name: "10연속 출석",
    description: "10경기 연속 참석했습니다",
    icon: "🔥",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  streak_20: {
    name: "20연속 출석",
    description: "20경기 연속 참석했습니다",
    icon: "💯",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  team_founder: {
    name: "팀 창단자",
    description: "팀을 직접 창단했습니다",
    icon: "👑",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  multi_team_5: {
    name: "용병왕",
    description: "5개 이상의 팀에서 활동했습니다",
    icon: "🌟",
    color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  },
  veteran_1year: {
    name: "1년차 베테랑",
    description: "서비스를 1년 이상 이용했습니다",
    icon: "🏅",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  veteran_2year: {
    name: "2년차 베테랑",
    description: "서비스를 2년 이상 이용했습니다",
    icon: "🏆",
    color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  },
  matches_10: {
    name: "10경기 달성",
    description: "총 10경기에 출전했습니다",
    icon: "🎮",
    color: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  },
  matches_50: {
    name: "50경기 달성",
    description: "총 50경기에 출전했습니다",
    icon: "🎯",
    color: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  },
  matches_100: {
    name: "100경기 달성",
    description: "총 100경기에 출전했습니다",
    icon: "🏟️",
    color: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30",
  },
  goals_10: {
    name: "10골 달성",
    description: "총 10골을 기록했습니다",
    icon: "⚽",
    color: "bg-lime-500/20 text-lime-400 border-lime-500/30",
  },
  goals_50: {
    name: "50골 달성",
    description: "총 50골을 기록했습니다",
    icon: "🥅",
    color: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  },
  assists_10: {
    name: "10어시스트 달성",
    description: "총 10어시스트를 기록했습니다",
    icon: "🤝",
    color: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  },
  assists_50: {
    name: "50어시스트 달성",
    description: "총 50어시스트를 기록했습니다",
    icon: "🎁",
    color: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  },
  hat_trick: {
    name: "해트트릭",
    description: "한 경기에서 3골을 기록했습니다",
    icon: "🎩",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  poker: {
    name: "포트트릭",
    description: "한 경기에서 4골 이상을 기록했습니다",
    icon: "🃏",
    color: "bg-red-600/20 text-red-400 border-red-600/30",
  },
  iron_man: {
    name: "철강왕",
    description: "특정 연도의 모든 경기에 출석했습니다",
    icon: "🦾",
    color: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  },
};

/**
 * 뱃지 정보 조회 (메타데이터 포함)
 */
export function getBadgeInfo(badgeType: BadgeType) {
  return BADGE_DEFINITIONS[badgeType] || null;
}
