# Technical Requirements Document (TRD)

## 1. Architecture Overview
### High-Level Design
- **Client**: Next.js (App Router) PWA-ready web application. Vercel Edge Network.
- **Backend/DB**: Supabase (PostgreSQL 15+).
  - **Auth**: Supabase Auth (Email/Password, Kakao/Google OAuth).
  - **API**: Next.js Server Actions (BFF pattern) + Supabase Client (RLS).
  - **Storage**: Supabase Storage (Team emblems, Player profiles, Match photos).
  - **Realtime**: Supabase Realtime (Match status updates - Optional for MVP).

### Data Flow
1. **Write**: User -> Next.js Server Action -> Supabase (with RLS & Validation Triggers).
2. **Read**: Server Component -> Supabase (Direct DB Query) -> Hydration.
3. **Optimistic UI**: React Query / Zustand 활용하여 즉각적인 UI 반응.

## 2. Technology Stack

| Category | Selection | Rationale | Alternatives Consideration |
| :--- | :--- | :--- | :--- |
| **Framework** | **Next.js 14+ (App Router)** | SEO 최적화, Server Actions를 통한 백엔드 로직 간소화. | React SPA (SEO 불리) |
| **Language** | **TypeScript** | 데이터 무결성이 중요한 기록 앱. 엄격한 타입 관리 필수. | JavaScript (생산성 높으나 유지보수 불리) |
| **Styling** | **Tailwind CSS** | 빠른 개발 속도, 일관된 디자인 시스템 적용 용이. | Styled-components (Runtime overhead) |
| **State** | **Zustand** | 가볍고 보일러플레이트가 적음. 컴포넌트 간 복잡한 상태 공유 해결. | Redux (Too boilerplate), Context (Rendering issue) |
| **Database** | **Supabase (PostgreSQL)** | RDB의 무결성 + Backendless의 생산성 겸비. | Firebase (NoSQL Query 한계), DRF/NestJS (개발 공수 큼) |
| **Testing** | **Jest + Playwright** | 유닛 테스트(계산 로직) + E2E(사용자 시나리오) 커버. | Cypress (느림), Vitest (Next.js 호환성 체크 필요) |

## 3. Data Model & Integrity (Key Decisions)
### 3.1. Entity Relationships (Abstract)
- `User` 1 : N `TeamMember` (한 유저가 여러 팀 활동 가능)
- `Team` 1 : N `Match` (홈팀 기준)
- `Match` 1 : N `MatchRecord` (선수별 기록)
- `Match` 1 : N `Goal` (득점 상세)

### 3.2. Special Logic: Guest Merge (용병 병합)
- **Scenario**: 비회원 '김용병'으로 5경기 기록 -> '김용병' 유저 가입 -> 기록 통합 요청.
- **Strategy**:
  1. `TeamMember` 테이블에 `is_guest: boolean` 필드 및 `guest_name` 존재.
  2. 실제 유저 가입 및 팀 합류 시, 기존 `guest_name`이 일치하는 레코드를 찾아 `user_id`를 업데이트(Link)하는 Admin/Manager 기능 제공.

### 3.3. Special Logic: Own Goal (자책골)
- **DB 저장**: `goals` 테이블
  - `scorer_id`: NULL (또는 자책골 범인 ID)
  - `type`: 'OWN_GOAL' enum
  - `team_id`: 득점을 얻은 팀 ID (상대팀)
  - **Display Logic**: 경기 상세에서는 '자책골'로 표기하되, 선수 개인 통계(득점 수)에는 집계되지 않도록 `type != OWN_GOAL` 필터링 필수.

## 4. Security & Permissions (RLS Policies)
- **Public**: 팀 리스트 조회, 공개 팀 상세 정보, 경기 결과 조회.
- **Authenticated**: 내 프로필 수정, 소속 팀 게시글 보기.
- **Team Manager Only**:
  - 팀 정보 수정, 멤버 승인/방출.
  - 경기 생성, 라인업 작성, 결과 입력/수정.
- **System**:
  - `users` 테이블의 민감 정보(이메일, 전화번호)는 `auth.uid() == id` 인 본인만 Select 가능.

## 5. Non-Functional Requirements (NFR)
- **NFR-1 (Integrity)**: 경기 종료(`status='FINISHED'`) 처리 시, `sum(player_goals)`와 `match_score`가 일치하지 않으면 트랜잭션 롤백 또는 에러 반환.
- **NFR-2 (Performance)**: 마이 페이지 조회 시 500ms 이내 렌더링 (인덱싱 필수: `user_id`, `team_id` 복합 인덱스).
- **NFR-3 (Mobile First)**: 모든 UI는 모바일 터치 인터페이스 우선 설계 (PC는 덤).

## 6. Integration & API
- **Maps**: 경기장 위치 찾기 (Kakao Map API or Naver Map API) - *MVP 후순위 (텍스트 입력 우선)*.
- **Notification**: 경기 일정 알림 - *MVP 제외*.
