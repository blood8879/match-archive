# TASKS (Implementation Plan)

## Milestone 0: Foundation
- [ ] **[TASK-001] Setup Project**
    - `create-next-app` (TypeScript, Tailwind, ESLint, App Router).
    - Install `shadcn/ui` (optional) or setup custom Design System tokens from `design_system.md`.
    - Setup Jest & Playwright environment.
- [ ] **[TASK-002] Supabase Init**
    - Create Supabase Project.
    - Run DDL script (from `database_schema.md`).
    - Generate Types (`supabase gen types typescript`).
    - Setup Storage buckets: `emblems`, `profiles`.

## Milestone 1: Auth & User Profile
- [ ] **[TASK-101] Auth UI Implementation**
    - Sign Up / Login Page (Email + Kakao Social Login if possible).
    - Onboarding: Nickname, Position, Region input.
    - Redirect to `/dashboard` upon completion.
- [ ] **[TASK-102] Navigation Layout**
    - Bottom Tab Bar (Mobile) / Header (PC).
    - Protected Route Middleware setup.

## Milestone 2: Team Operations
- [ ] **[TASK-201] Display Team List & Search**
    - UI: Team List Card, Search Bar.
    - API: `getTeams(region, query)`.
- [ ] **[TASK-202] Create Team Flow**
    - UI: Team Creation Form (Name, Emblem Upload, Region).
    - Logic: Transaction (Create Team -> Add Owner as Manager).
- [ ] **[TASK-203] Team Detail & Membership**
    - UI: Team Info, Member List (Active/Pending/Guest).
    - Logic: Join Request, Approve/Reject.
    - Guest Add Modal: "용병(비회원) 추가" feature.

## Milestone 3: Match & Records (Core)
- [ ] **[TASK-301] Create Match**
    - UI: Date, Time, Location, Opponent Name input.
    - DB: Insert into `matches`.
- [ ] **[TASK-302] Match Detail & Lineup**
    - UI: Match Info, "Who played?" checkbox list (Lineup).
    - Logic: Create `match_records` for checked players (init stats 0).
- [ ] **[TASK-303] Record Input Form (Complex)**
    - UI: Score input, Goal/Assist input per quarter.
    - **Logic: Own Goal Handling** (Select Opponent team or None for scorer).
    - **Validation**: Check if `Sum(Goals) == TeamScore`.
- [ ] **[TASK-304] Finish Match Logic**
    - Action: "경기 종료" Button.
    - DB Trigger/Transaction: Update Team Stats (Win/Loss), Player Stats (Goals/Assists).

## Milestone 4: Stats & Dashboard
- [ ] **[TASK-401] Personal Dashboard**
    - UI: My Career Stats (Goals, Matches, Win Rate).
    - Logic: Aggregation Query `sum(goals) from match_records`.
- [ ] **[TASK-402] Team Dashboard**
    - UI: Recent 5 Matches (W-D-L-W-L), Squad List with stats.

## Milestone 5: Polish & Test
- [ ] **[TASK-501] E2E Testing**
    - Critical Path: Signup -> Create Team -> Create Match -> Input Result.
- [ ] **[TASK-502] UI Polish**
    - Apply Glassmorphism & Animations.
    - Responsive Check.
