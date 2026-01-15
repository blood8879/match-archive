# 뱃지 시스템 (Badge System)

사용자의 활동과 업적을 기반으로 자동으로 수여되는 뱃지 시스템입니다.

## 개요

- **목적**: 아마추어 축구에서 수치화하기 어려운 "플레이스타일 분석"이나 "티어" 대신, 실제 활동 기반의 업적 시스템 제공
- **자동 수여**: 데이터베이스 트리거를 통해 조건 충족 시 자동으로 뱃지 수여
- **중복 방지**: 동일 뱃지는 사용자당 1개만 획득 가능 (UNIQUE 제약)

## 뱃지 목록 (17종)

### 첫 기록 뱃지

| 뱃지 | 타입 | 조건 | 아이콘 |
|------|------|------|--------|
| 첫 골 | `first_goal` | 첫 번째 골 기록 | ⚽ |
| 첫 어시스트 | `first_assist` | 첫 번째 어시스트 기록 | 🎯 |
| 첫 MOM | `first_mom` | 첫 번째 경기 MVP 선정 | ⭐ |

### 연속 출석 뱃지

| 뱃지 | 타입 | 조건 | 아이콘 |
|------|------|------|--------|
| 5연속 출석 | `streak_5` | 5경기 연속 참석 | 🔥 |
| 10연속 출석 | `streak_10` | 10경기 연속 참석 | 🔥 |
| 20연속 출석 | `streak_20` | 20경기 연속 참석 | 💯 |

### 경기 수 뱃지

| 뱃지 | 타입 | 조건 | 아이콘 |
|------|------|------|--------|
| 10경기 달성 | `matches_10` | 총 10경기 출전 | 🎮 |
| 50경기 달성 | `matches_50` | 총 50경기 출전 | 🎯 |
| 100경기 달성 | `matches_100` | 총 100경기 출전 | 🏟️ |

### 골 뱃지

| 뱃지 | 타입 | 조건 | 아이콘 |
|------|------|------|--------|
| 10골 달성 | `goals_10` | 총 10골 기록 | ⚽ |
| 50골 달성 | `goals_50` | 총 50골 기록 | 🥅 |

### 어시스트 뱃지

| 뱃지 | 타입 | 조건 | 아이콘 |
|------|------|------|--------|
| 10어시스트 달성 | `assists_10` | 총 10어시스트 기록 | 🤝 |
| 50어시스트 달성 | `assists_50` | 총 50어시스트 기록 | 🎁 |

### 팀 활동 뱃지

| 뱃지 | 타입 | 조건 | 아이콘 |
|------|------|------|--------|
| 팀 창단자 | `team_founder` | 팀을 직접 창단 (OWNER 역할) | 👑 |
| 용병왕 | `multi_team_5` | 5개 이상 팀에서 활동 | 🌟 |

### 베테랑 뱃지

| 뱃지 | 타입 | 조건 | 아이콘 |
|------|------|------|--------|
| 1년차 베테랑 | `veteran_1year` | 서비스 가입 후 1년 경과 | 🏅 |
| 2년차 베테랑 | `veteran_2year` | 서비스 가입 후 2년 경과 | 🏆 |

## 데이터베이스 구조

### user_badges 테이블

```sql
CREATE TABLE public.user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    badge_type TEXT NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(user_id, badge_type)
);
```

### 주요 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | 뱃지 고유 ID |
| `user_id` | UUID | 뱃지 소유자 |
| `badge_type` | TEXT | 뱃지 타입 (위 목록 참조) |
| `earned_at` | TIMESTAMPTZ | 획득 시간 |
| `metadata` | JSONB | 추가 정보 (획득 시 경기 ID, 누적 수치 등) |

## 자동 수여 트리거

### 1. 경기 기록 트리거 (`on_match_record_badge_check`)

`match_records` 테이블에 INSERT/UPDATE 시 실행:
- 첫 골/어시스트/MOM 체크
- 경기 수 마일스톤 체크 (10/50/100)
- 골/어시스트 마일스톤 체크 (10/50)
- 베테랑 뱃지 체크 (계정 생성 기간)

### 2. 팀 멤버 트리거 (`on_team_member_badge_check`)

`team_members` 테이블에 INSERT/UPDATE 시 실행:
- 팀 창단자 뱃지 (OWNER 역할)
- 용병왕 뱃지 (5개+ 팀 활동)

## 코드 구조

### 파일 위치

```
src/
├── lib/
│   └── badge-definitions.ts    # 뱃지 메타데이터 정의 (이름, 설명, 아이콘, 색상)
├── services/
│   └── badges.ts               # 뱃지 서비스 함수 (조회)
└── types/
    └── supabase.ts             # BadgeType, UserBadge 타입 정의

supabase/migrations/
└── 018_create_user_badges.sql  # DB 테이블, 트리거, 함수 정의
```

### 주요 함수

```typescript
// 사용자의 뱃지 목록 조회
getUserBadges(userId?: string): Promise<UserBadge[]>

// 뱃지 목록과 메타데이터 함께 조회
getUserBadgesWithInfo(userId?: string): Promise<(UserBadge & { info: BadgeInfo })[]>

// 모든 뱃지 상태 조회 (획득 여부 포함)
getAllBadgesWithStatus(userId?: string): Promise<BadgeWithStatus[]>
```

### 뱃지 정보 조회 예시

```typescript
import { BADGE_DEFINITIONS } from "@/lib/badge-definitions";
import { getUserBadges } from "@/services/badges";

// 사용자 뱃지 조회
const badges = await getUserBadges(userId);

// 뱃지 정보 표시
badges.forEach(badge => {
  const info = BADGE_DEFINITIONS[badge.badge_type];
  console.log(`${info.icon} ${info.name}: ${info.description}`);
});
```

## UI 표시

프로필 페이지 (`/profile`)에서 획득한 뱃지를 그리드 형태로 표시합니다.

각 뱃지 카드에는:
- 아이콘
- 뱃지 이름
- 설명
- 색상 테마 (뱃지 유형별 고유 색상)

## 향후 확장 가능성

1. **새 뱃지 추가**: `badge-definitions.ts`와 DB 트리거에 새 타입 추가
2. **연속 출석 로직 개선**: 현재 단순 로직 → 더 정교한 계산 가능
3. **뱃지 알림**: 새 뱃지 획득 시 알림 발송
4. **뱃지 랭킹**: 가장 많은 뱃지를 보유한 사용자 표시
5. **희귀 뱃지**: 조건이 어려운 특별 뱃지 추가
