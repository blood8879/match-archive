# Coding Convention & AI Collaboration Guide

## 1. Tech Stack Standards
- **Framework**: Next.js 14+ App Router (`src/app`).
- **Language**: TypeScript Strict Mode (`noImplicitAny: true`).
- **Style**: Tailwind CSS with arbitrary values minimized (use `design_system.md` tokens).
- **State**: Zustand for client global state, React Query for server state.
- **Icons**: Lucide React.

## 2. Directory Structure
```
src/
├── app/                  # Routes (page.tsx, layout.tsx, route.ts)
├── components/
│   ├── ui/               # Reusable base components (Button, Input)
│   ├── features/         # Feature-specific components (LineupBoard, ScoreCard)
│   └── layout/           # Header, Footer, Sidebar
├── lib/
│   ├── supabase/         # Client/Server clients
│   └── utils.ts          # Helper functions
├── hooks/                # Custom React hooks
├── services/             # API service layer (Server Actions preferably)
├── types/                # Supabase generated types + Extended types
└── __tests__ /           # Unit tests
```

## 3. Naming Conventions
- **Files**: `kebab-case.tsx` (e.g., `match-card.tsx`).
- **Components**: `PascalCase` (e.g., `MatchCard`).
- **Functions**: `camelCase` (e.g., `calculateWinRate`).
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_PLAYERS`).

## 4. Testing Strategy (Don't Trust, Verify)
- **Scope**:
  - `libs/` util functions MUST be unit tested (Jest).
  - Critical Flows (Auth, Match Result Input) MUST be E2E tested (Playwright).
- **AI Rule**: When generating complex logic (e.g., stats calculation), ALWAYS generate the corresponding test file immediately.

## 5. Security & Performance Rules
- **RLS**: Never turn off Row Level Security on Supabase.
- **Server Actions**: Define strictly in `server-only` files. Do not expose sensitive logic to client.
- **Image Opt**: Use `next/image` for all user-uploaded content with lazy loading.

## 6. AI Collaboration Workflow
1. **Context First**: Always read `PRD.md` and `TRD.md` before coding.
2. **Small Batches**: Implement one [TASK] at a time.
3. **Self-Correction**: If a build error occurs, read the log, fix it, and *explain why it happened*.
4. **Update Docs**: If implementation details change, update `TRD.md` or `database_schema.md`.
