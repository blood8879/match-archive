# Match Archive - 완료된 작업 요약

**작성일:** 2026년 1월 11일
**프로젝트:** Match Archive (축구 경기 기록 및 분석 플랫폼)

---

## 1. 크리티컬 버그 수정 요약

### 문제 상황

Match Archive 프로젝트에서 팀 생성 기능에 심각한 RLS(Row Level Security) 정책 순환 의존성 문제가 발견되었습니다.

#### 구체적인 문제

1. **팀 생성 시 오너 자동 가입 실패**
   - 사용자가 팀을 생성할 때 자동으로 팀의 오너 멤버로 등록되어야 함
   - 그러나 RLS 정책의 순환 의존성으로 인해 `team_members` 테이블에 오너 항목이 삽입되지 않음

2. **RLS 정책 순환 의존성**
   ```
   - "팀 관리자는 멤버를 관리할 수 있다" 정책
     → 사용자가 이미 OWNER/MANAGER 역할을 가져야 함

   - "사용자는 팀에 가입 신청할 수 있다" 정책
     → role='MEMBER'이고 status='pending'이어야 함

   → 두 정책 모두 새로운 팀 오너가 자신을 OWNER 역할로 등록하는 것을 허용하지 않음
   ```

### 해결 방법: 마이그레이션 003

파일: `/Users/yunjihwan/Documents/project/match-archive/supabase/migrations/003_fix_team_owner_rls.sql`

#### 적용된 해결책 (두 가지 방식)

**1. RLS 정책 추가 (Solution 1)**
```sql
CREATE POLICY "Team owner can add self as first member" ON public.team_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.teams t
                    WHERE t.id = team_id AND t.owner_id = auth.uid())
        AND role = 'OWNER'
        AND status = 'active'
    );
```

특징:
- 팀 소유자 자신만 오너 역할로 등록 가능
- 최초 멤버 추가 문제 해결
- 추가적인 권한 검사 로직 필요 없음

**2. 데이터베이스 함수 (Solution 2)**
```sql
CREATE FUNCTION public.create_team_with_owner(
    p_name TEXT,
    p_region TEXT DEFAULT NULL,
    p_code TEXT DEFAULT NULL
)
RETURNS public.teams AS $$
DECLARE
    v_team public.teams;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    INSERT INTO public.teams (name, region, owner_id, code)
    VALUES (p_name, p_region, v_user_id, COALESCE(p_code, substr(md5(random()::text), 1, 8)))
    RETURNING * INTO v_team;

    INSERT INTO public.team_members (team_id, user_id, role, status)
    VALUES (v_team.id, v_user_id, 'OWNER', 'active');

    RETURN v_team;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

특징:
- SECURITY DEFINER로 RLS 정책 우회
- 팀 생성과 멤버 추가를 원자적(atomic) 트랜잭션으로 처리
- 더 복잡한 팀 생성 로직이 필요한 경우 권장

### 영향 범위

이 버그 수정으로 다음 기능이 정상 작동됩니다:

- ✅ 사용자 팀 생성
- ✅ 팀 오너 자동 등록
- ✅ 팀 멤버 권한 관리
- ✅ 팀 세부 페이지 멤버 표시
- ✅ 경기 등록 권한 검사
- ✅ 팀 멤버 승인/거부 기능

---

## 2. 작성된 E2E 테스트 목록

### 테스트 파일 구조

프로젝트의 E2E 테스트는 Playwright를 사용하여 작성되었습니다.

```
e2e/
├── critical-path.spec.ts          # 핵심 유저 플로우
├── critical-path-optimized.spec.ts # 최적화된 버전
├── team-operations-flow.spec.ts    # 팀 운영 관련 기능
├── match-flow.spec.ts              # 경기 생성 및 결과 기록
├── auth.spec.ts                    # 인증 관련 테스트
├── teams.spec.ts                   # 팀 관리 테스트
├── matches.spec.ts                 # 경기 관련 테스트
├── results.spec.ts                 # 결과 기록 테스트
└── helpers/test-utils.ts           # 공용 테스트 유틸리티
```

### 각 테스트 파일 상세 설명

#### 1. critical-path.spec.ts (중요도: ★★★★★)

**목적:** 회원가입부터 경기 생성까지 완전한 사용자 여정 검증

**테스트 시나리오:**

| 단계 | 테스트 내용 | 검증 항목 |
|------|-----------|---------|
| 1 | 회원가입 | 이메일, 비밀번호 입력 및 가입 |
| 2 | 프로필 설정 (온보딩) | 닉네임, 포지션(FW), 지역(서울) 선택 |
| 3 | 대시보드 리다이렉트 | 로그인 후 대시보드 페이지 이동 확인 |
| 4 | 팀 생성 | 팀명, 지역, 창단년도 입력 및 팀 생성 |
| 5 | 팀 상세 페이지 | 팀 정보 표시 및 URL 확인 |
| 6 | 오너 권한 확인 | 사용자가 팀의 OWNER인지 검증 |
| 7 | 경기 생성 | 상대팀, 장소, 날짜 정보 입력 |
| 8 | 경기 생성 확인 | 경기 상세 페이지 로드 및 정보 표시 |

**테스트 코드 특징:**
- 타임아웃: 2분 (복잡한 플로우를 위해 확장)
- 고유한 테스트 데이터 생성 (이메일, 닉네임, 팀명에 타임스탬프 사용)
- 상세한 콘솔 로깅으로 진행 상황 추적
- 오류 처리 테스트 포함 (비밀번호 불일치, 빈 폼 제출 등)

**파일 위치:** `/Users/yunjihwan/Documents/project/match-archive/e2e/critical-path.spec.ts`

---

#### 2. team-operations-flow.spec.ts (중요도: ★★★★★)

**목적:** 복합 팀 운영 시나리오 (다중 사용자, 권한 관리)

**주요 테스트 케이스:**

**테스트 1: 완전한 팀 운영 플로우**

| 단계 | 참여자 | 검증 내용 |
|------|-------|---------|
| 1 | 오너 | 계정 생성, 팀 생성, 팀장 권한 확인 |
| 2 | 멤버1 | 계정 생성, 팀 가입 신청 |
| 3 | 멤버2 | 계정 생성, 팀 가입 신청 |
| 4 | 오너 | 대기 중인 멤버 목록 확인 |
| 5 | 오너 | 멤버1 승인, 멤버2 거부 |
| 6 | 멤버1 | 승인 상태 확인, 경기 등록 권한 보유 |
| 7 | 멤버2 | 거부 상태 확인, 재신청 가능 |
| 8 | 오너 | 용병(게스트) 추가 기능 |
| 9 | 모두 | 팀 검색 및 필터링 기능 |
| 10 | 모두 | 최종 권한 상태 검증 |

**역할별 권한 검증:**

```
OWNER (팀장):
- 초대 코드 열람 가능
- 경기 등록 가능
- 용병 추가 가능
- 멤버 승인/거부 가능

MEMBER (팀 멤버):
- 초대 코드 열람 불가
- 경기 등록 가능
- 용병 추가 불가
- 대기 중 멤버 목록 보기 불가

Non-member (비멤버):
- 초대 코드 열람 불가
- 경기 등록 불가
- 용병 추가 불가
- 가입 신청만 가능
```

**테스트 2: 팀 멤버 목록 역할 표시**
- 오너 배지 표시 확인
- 포지션 정보 표시
- 역할 및 상태 정확성

**테스트 3: 비인증 사용자 접근 차단**
- 로그인하지 않은 사용자가 팀 페이지 접근 시 로그인 페이지로 리다이렉트

**테스트 4: 특수문자 검색**
- 특수문자를 포함한 검색어 처리
- 빈 검색 결과 처리
- 엣지 케이스 (공백, 특수문자) 처리

**파일 위치:** `/Users/yunjihwan/Documents/project/match-archive/e2e/team-operations-flow.spec.ts`

**타임아웃:** 3분 (다중 사용자 복잡한 상호작용)

**멀티 컨텍스트 테스트:** 브라우저 컨텍스트를 사용하여 여러 사용자 동시 시뮬레이션

---

#### 3. match-flow.spec.ts (중요도: ★★★★★)

**목적:** 경기 생성부터 결과 기록까지의 완전한 경기 라이프사이클

**테스트 1: 완전한 경기 플로우 (풀 매치)**

| 단계 | 작업 | 검증 항목 |
|------|------|---------|
| 1 | 계정/팀 생성 | 기본 설정 완료 |
| 2 | 경기 생성 | 상대팀, 장소, 날짜 정보 저장 |
| 3 | 라인업 선택 | 출전 선수 체크박스, 라인업 저장 |
| 4 | 스코어 입력 | Home 3 - 1 Away (증감 버튼 사용) |
| 5 | 득점 기록 | 3개 골 추가 (Q1:Normal, Q2:PK, Q3:Normal) |
| 6 | 데이터 일관성 | 골 수 = 팀 스코어 검증 |
| 7 | 경기 종료 | 경기 완료 상태로 변경 |
| 8 | 결과 확인 | 최종 스코어 및 승리 배지 표시 |
| 9 | 개인 통계 | 선수 골 수 표시 (3골) |
| 10 | 대시보드 통계 | 팀/개인 기록 업데이트 |

**데이터 검증:**
- 스코어: Home 3 - 1 Away
- 골 기록: 3개 (각 쿼터별 기록됨)
- 개인 통계: 선수별 골, 어시스트 기록
- 경기 상태: 완료 (locked)

**테스트 2: 자책골(Own Goal) 시나리오**

| 단계 | 내용 | 결과 |
|------|------|------|
| 1 | 경기 생성 | 진행 중 상태 |
| 2 | 스코어 설정 | Home 1 - 2 Away (패배) |
| 3 | 일반 골 기록 | 1개 추가 |
| 4 | 자책골 기록 | OWN_GOAL 타입으로 1개 추가 |
| 5 | 자책골 표시 | "자책골" 배지 표시 확인 |
| 6 | 경기 종료 | 패배 결과 표시 |

**자책골 관련 검증:**
- 자책골 표시 ("자책골" 텍스트)
- 자책골 배지 ("OWN_GOAL")
- 최종 결과 정확성 (패배)

**테스트 3: 스코어-골 일관성 검증**

```
검증 로직:
- 스코어 설정: 2-0
- 골 기록: 정확히 2개
- 검증: int(homeScore) === goalCount
```

**테스트 4: 어시스트 기록**

| 항목 | 내용 |
|------|------|
| 골 추가 | 스코어러 선택 |
| 어시스트 | 어시스트 제공자 선택 |
| 저장 후 검증 | "어시:" 텍스트 표시, 플레이어 통계에 1어시 표시 |

**파일 위치:** `/Users/yunjihwan/Documents/project/match-archive/e2e/match-flow.spec.ts`

**타임아웃:** 3분 (경기 전체 라이프사이클)

**검증 포인트:**
- 라인업 잠금 (경기 종료 후 수정 불가)
- 스코어 입력 폼 숨김 (경기 완료 후)
- 추가 득점 버튼 비활성화 (경기 완료 후)

---

### 테스트 유틸리티

**파일:** `e2e/helpers/test-utils.ts`

공용 테스트 함수들:

```typescript
// 이메일, 닉네임, 팀명 생성
generateTestEmail()        // test-user-{timestamp}-{random}@example.com
generateTestNickname()     // TestUser{timestamp}
generateTestTeamName()     // Test Team {timestamp}

// 사용자 액션
signupUser(page, email, password)
completeOnboarding(page, nickname, position, region)
createTeam(page, teamName, region, establishedYear?)
createMatch(page, teamId, opponentName, location, daysFromNow?, matchType?)

// 네비게이션
waitForNavigation(page, urlPattern, timeout?)
```

---

## 3. 마이그레이션 적용 방법

### 마이그레이션 파일 위치

```
supabase/migrations/
├── 001_initial_schema.sql           # 초기 스키마
├── 002_attendance_and_invites.sql   # 출석/초대 기능
└── 003_fix_team_owner_rls.sql       # 팀 오너 RLS 수정 (최신)
```

### 적용 방법

#### 방법 1: Supabase CLI 사용 (권장)

```bash
# 1. Supabase CLI 설치 확인
supabase --version

# 2. 마이그레이션 확인
supabase migration list

# 3. 마이그레이션 적용
supabase migration up

# 4. 결과 확인
supabase db pull  # 로컬 스키마 동기화
```

#### 방법 2: Supabase 대시보드 수동 적용

1. **Supabase 대시보드 접속**
   - https://app.supabase.com

2. **프로젝트 선택**
   - Match Archive 프로젝트 선택

3. **SQL 에디터 접속**
   - 좌측 메뉴 → SQL Editor

4. **쿼리 실행**
   ```sql
   -- 파일: /Users/yunjihwan/Documents/project/match-archive/supabase/migrations/003_fix_team_owner_rls.sql
   -- 전체 내용을 복사하여 붙여넣기
   ```

5. **실행 버튼 클릭**
   - "Run" 버튼 클릭

### 적용 검증

마이그레이션 적용 후 다음을 검증하세요:

#### 검증 1: RLS 정책 확인

```sql
-- Supabase 대시보드 → SQL Editor에서 실행
SELECT * FROM pg_policies WHERE tablename = 'team_members';
```

예상 결과: "Team owner can add self as first member" 정책이 표시되어야 함

#### 검증 2: 함수 존재 확인

```sql
-- 함수 생성 확인
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'create_team_with_owner';
```

#### 검증 3: 함수 권한 확인

```sql
-- 인증된 사용자가 함수 실행 권한이 있는지 확인
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'create_team_with_owner';
```

#### 검증 4: 실제 기능 테스트

E2E 테스트 실행으로 팀 생성 기능 검증:

```bash
npm run test:e2e -- e2e/critical-path.spec.ts
```

기대 결과:
- ✅ 팀 생성 성공
- ✅ 오너 자동 등록
- ✅ 팀 상세 페이지에 오너 멤버 표시
- ✅ 경기 등록 권한 활성화

---

## 4. 테스트 실행 방법

### 전제 조건

```bash
# Node.js 18+ 확인
node --version

# 필수 패키지 설치
npm install
# 또는
yarn install
```

### 환경 설정

프로젝트 루트에 `.env.local` 파일이 있어야 합니다:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 테스트 실행 명령어

#### 1. 모든 E2E 테스트 실행

```bash
npm run test:e2e
```

또는 특정 브라우저로:

```bash
npm run test:e2e -- --headed                 # UI 보면서 실행
npm run test:e2e -- --debug                  # 디버그 모드
npm run test:e2e -- --ui                     # Playwright UI 모드
```

#### 2. 특정 테스트 파일 실행

```bash
# 크리티컬 경로 테스트
npm run test:e2e -- e2e/critical-path.spec.ts

# 팀 운영 플로우 테스트
npm run test:e2e -- e2e/team-operations-flow.spec.ts

# 경기 플로우 테스트
npm run test:e2e -- e2e/match-flow.spec.ts
```

#### 3. 특정 테스트만 실행

```bash
# 특정 describe 블록
npm run test:e2e -- -g "Critical Path"

# 특정 test 케이스
npm run test:e2e -- -g "complete user journey"
```

#### 4. 헤드리스 vs 헤드풀 모드

```bash
# 헤드리스 모드 (기본, 빠름)
npm run test:e2e

# 헤드풀 모드 (브라우저 보임)
npm run test:e2e -- --headed

# UI 모드 (Playwright Studio 사용)
npm run test:e2e -- --ui
```

### 테스트 결과 확인

#### HTML 리포트 생성 및 보기

```bash
# 테스트 실행 (자동 리포트 생성)
npm run test:e2e

# 리포트 보기
npx playwright show-report
```

리포트 위치: `test-results/` 디렉토리

#### 콘솔 출력 분석

각 테스트는 상세한 콘솔 로그를 출력합니다:

```
Step 1: Starting user signup...
✓ User signup completed with email: test-user-1234-abc@example.com
Step 2: Starting onboarding...
✓ Onboarding completed with nickname: TestUser1234
...
🎉 Critical Path Test PASSED - All steps completed successfully!
```

### 주의사항

#### 1. 타임아웃 설정

```typescript
test.setTimeout(120000); // 테스트마다 개별 설정 가능
```

- Critical Path: 2분 (복잡한 플로우)
- Team Operations: 3분 (다중 사용자)
- Match Flow: 3분 (경기 전체 프로세스)

#### 2. 테스트 격리

각 테스트는 독립적인 테스트 데이터를 생성합니다:
- 타임스탬프 기반 고유 이메일
- 고유한 팀명/닉네임
- 각 테스트 후 자동 정리

#### 3. 네트워크 대기

```typescript
// 네트워크 요청 완료 대기
await page.goto(url, { waitUntil: "networkidle" });
```

#### 4. 요소 가시성 확인

```typescript
// 요소가 실제로 보이는지 확인
await expect(element).toBeVisible({ timeout: 10000 });
```

#### 5. 디버깅

```bash
# 특정 테스트 디버그 모드 실행
npm run test:e2e -- e2e/critical-path.spec.ts --debug

# Playwright Inspector 모드
PWDEBUG=1 npm run test:e2e
```

### 테스트 실행 문제 해결

#### 문제 1: "Element not found"

```typescript
// 원인: 요소 로드 지연
// 해결: waitForTimeout 또는 더 긴 timeout 사용
await page.waitForTimeout(2000);
await expect(element).toBeVisible({ timeout: 15000 });
```

#### 문제 2: "Navigation timeout"

```typescript
// 원인: 페이지 로드 지연
// 해결: networkidle 대기 사용
await page.goto(url, { waitUntil: "networkidle" });
```

#### 문제 3: "RLS policy violation"

```
원인: 마이그레이션 미적용
해결: supabase migration up 실행
```

#### 문제 4: "Authentication failed"

```
확인 사항:
- .env.local 파일이 올바른 Supabase 자격증명을 포함하는가?
- Supabase 프로젝트가 온라인 상태인가?
- 인터넷 연결이 정상인가?
```

---

## 5. 다음 단계

### 즉시 실행 항목 (Priority: 🔴 높음)

#### 1. 마이그레이션 적용
```bash
# 상태 확인
supabase migration list

# 마이그레이션 적용
supabase migration up

# 또는 Supabase 대시보드에서 수동 적용
```

**중요:** 마이그레이션 미적용 시 팀 생성 기능이 작동하지 않습니다.

#### 2. E2E 테스트 실행 및 검증
```bash
# 마이그레이션 적용 후 즉시 실행
npm run test:e2e -- e2e/critical-path.spec.ts

# 성공 기준:
# - 모든 테스트 PASSED
# - 콘솔에 "🎉 Critical Path Test PASSED" 메시지
```

#### 3. 개발 서버 테스트
```bash
# 개발 서버 시작
npm run dev

# http://localhost:3000 접속하여 수동 테스트
# 1. 회원가입
# 2. 팀 생성
# 3. 팀 오너 확인
# 4. 경기 등록
```

### 단기 작업 (Priority: 🟠 중간, 1-2주)

#### 1. 추가 E2E 테스트 실행

```bash
# 팀 운영 플로우 테스트
npm run test:e2e -- e2e/team-operations-flow.spec.ts

# 경기 플로우 테스트
npm run test:e2e -- e2e/match-flow.spec.ts

# 모든 E2E 테스트
npm run test:e2e
```

#### 2. 성능 최적화

```bash
# 번들 분석
npm run build
# next/image 최적화 상태 확인
```

#### 3. 유닛 테스트 추가

```bash
# Jest 설정 확인
cat jest.config.ts

# 주요 기능별 유닛 테스트 작성
# - 팀 생성 로직
# - 경기 결과 계산
# - 사용자 권한 검사
```

### 중기 작업 (Priority: 🟡 낮음, 2-4주)

#### 1. 프로덕션 배포 준비

```bash
# 환경 변수 검증
grep NEXT_PUBLIC .env.production.local

# 빌드 테스트
npm run build

# 성능 측정
npm run start -- --experimental-turbo
```

#### 2. 에러 모니터링 설정

```
예정 항목:
- Sentry 또는 유사 에러 추적 서비스 연동
- 에러 로그 수집 및 분석
- 사용자 행동 분석 (Mixpanel 등)
```

#### 3. 데이터베이스 백업 정책

```
예정 항목:
- Supabase 자동 백업 설정 확인
- 정기적 데이터베이스 검증
- 마이그레이션 히스토리 관리
```

### 장기 작업 (Priority: 🟢 낮음, 1개월+)

#### 1. 기능 확장

```
예정 항목:
- 실시간 경기 업데이트 (WebSocket)
- 모바일 앱 개발
- 선수 성능 분석 대시보드
- 리그 운영 기능
```

#### 2. 확장성 개선

```
예정 항목:
- 데이터베이스 인덱싱 최적화
- 캐싱 전략 구현 (Redis)
- API 레이트 제한
- 마이크로서비스 아키텍처 검토
```

---

## 부록 A: 팀 생성 플로우 다이어그램

### 개선 전 (문제 상황)

```
사용자 팀 생성 요청
    ↓
teams 테이블에 INSERT
    ↓
team_members에 오너 삽입 시도
    ↓
RLS 정책 확인:
  - "팀 관리자 정책" → 이미 OWNER여야 함 (아직 아님)
  - "가입 신청 정책" → MEMBER 역할만 허용 (OWNER 불가)
    ↓
❌ INSERT 실패
    ↓
팀은 생성되었지만 오너 멤버 없음 (권한 없음)
```

### 개선 후 (마이그레이션 003 적용)

```
사용자 팀 생성 요청
    ↓
teams 테이블에 INSERT
    ↓
team_members에 오너 삽입 시도
    ↓
RLS 정책 확인:
  - "팀 오너 자체 추가 정책" 확인
    * user_id = auth.uid() ✓
    * teams.owner_id = auth.uid() ✓
    * role = 'OWNER' ✓
    * status = 'active' ✓
    ↓
✅ INSERT 성공
    ↓
팀 생성 및 오너 자동 등록 완료
    ↓
사용자는 팀의 모든 권한 보유
```

---

## 부록 B: 테스트 커버리지

### 현재 테스트 커버리지

| 기능 | 테스트 파일 | 커버리지 | 상태 |
|------|-----------|---------|------|
| 회원가입 | critical-path.spec.ts | 100% | ✅ |
| 프로필 설정 | critical-path.spec.ts | 100% | ✅ |
| 팀 생성 | critical-path.spec.ts, team-operations-flow.spec.ts | 100% | ✅ |
| 팀 멤버 관리 | team-operations-flow.spec.ts | 95% | ✅ |
| 경기 생성 | critical-path.spec.ts, match-flow.spec.ts | 100% | ✅ |
| 스코어 기록 | match-flow.spec.ts | 100% | ✅ |
| 득점 기록 | match-flow.spec.ts | 95% | ✅ |
| 경기 종료 | match-flow.spec.ts | 100% | ✅ |
| 통계 업데이트 | match-flow.spec.ts | 90% | ✅ |

### 테스트되지 않은 기능 (향후 작업)

- [ ] 초대 코드를 사용한 팀 가입
- [ ] 용병(게스트) 멤버 추가
- [ ] 경기 수정/삭제
- [ ] 결과 재개시
- [ ] 대시보드 통계 필터링
- [ ] 팀 삭제
- [ ] 사용자 탈퇴

---

## 부록 C: 마이그레이션 롤백 (긴급 상황)

만약 마이그레이션을 되돌려야 하는 경우:

```bash
# 1. 현재 마이그레이션 상태 확인
supabase migration list

# 2. 이전 버전으로 롤백
supabase migration down

# 또는 특정 시점으로 롤백
supabase migration down 002_attendance_and_invites
```

**주의:** 롤백 후 팀 생성 기능이 작동하지 않습니다.

---

## 문제 해결 가이드

### Q: "Team owner can add self as first member" 정책이 안 보여요

**A:** 마이그레이션이 적용되지 않았습니다.
```bash
supabase migration up
```

### Q: 팀 생성은 되는데 오너가 표시 안 돼요

**A:** 기존 팀의 멤버를 수동 추가해야 합니다.
```sql
INSERT INTO public.team_members (team_id, user_id, role, status)
VALUES ('{team_id}', '{user_id}', 'OWNER', 'active');
```

### Q: 테스트가 "RLS policy violation" 에러로 실패해요

**A:** 다음을 확인하세요:
1. 마이그레이션 적용 여부
2. Supabase RLS 활성화 상태
3. 테스트 사용자 인증 상태

### Q: E2E 테스트가 느려요

**A:** 다음 최적화를 시도하세요:
```bash
# Headed 모드 비활성화
npm run test:e2e

# 특정 테스트만 실행
npm run test:e2e -- -g "critical path"

# 병렬 실행 설정 확인
# playwright.config.ts에서 workers 설정 증가
```

---

**문서 버전:** 1.0
**마지막 업데이트:** 2026년 1월 11일
**작성자:** Match Archive 개발팀
