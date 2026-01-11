# 팀 가입 및 경기 참석 기능 구현 완료

## 📋 구현 개요

팀 가입 시스템과 경기 참석 기능이 완전히 구현되었으며, 참석 표시 플레이어가 라인업 선택 시 자동으로 우선 표시됩니다.

---

## ✅ 구현된 기능

### 1. 팀 가입 시스템

#### 기능
- ✅ 팀 검색 및 가입 신청
- ✅ 중복 가입 신청 방지
- ✅ 팀 매니저/오너의 가입 승인/거부
- ✅ 실시간 팀원 수 자동 업데이트
- ✅ 역할 기반 권한 관리 (OWNER, MANAGER, MEMBER)

#### 구현 파일
- `src/app/(protected)/teams/[id]/join-team-button.tsx` - 가입 신청 버튼
- `src/services/teams.ts` - 서버 액션 (requestJoinTeam, approveMember, rejectMember)
- `src/app/(protected)/teams/[id]/manage/members/page.tsx` - 팀원 관리 페이지
- `src/app/(protected)/teams/[id]/member-list.tsx` - 멤버 리스트 컴포넌트

#### 데이터베이스
- `team_members` 테이블의 `status` 필드: 'pending' → 'active'
- RLS 정책으로 권한 제어
- 트리거로 팀원 수 자동 업데이트

---

### 2. 경기 참석 시스템

#### 기능
- ✅ 3가지 참석 상태 (참석/미정/불참)
- ✅ 낙관적 UI 업데이트로 즉각적인 피드백
- ✅ 참석 상태 실시간 변경 가능
- ✅ 경기 완료 후 참석 버튼 자동 비활성화

#### 구현 파일
- `src/app/(protected)/matches/[id]/attendance-button.tsx` - 참석 버튼 컴포넌트
- `src/services/matches.ts` - 참석 관련 서버 액션
  - `getMatchAttendance()` - 경기 참석 정보 조회
  - `updateAttendance()` - 참석 상태 업데이트 (upsert)
  - `getAttendingMembers()` - 참석 중인 멤버 ID 목록

#### 데이터베이스
- `match_attendance` 테이블
- 상태값: 'attending' | 'maybe' | 'absent'
- Unique 제약: (match_id, team_member_id)
- CASCADE 삭제로 경기 삭제 시 참석 기록도 함께 삭제

---

### 3. 라인업 자동 우선 표시

#### 기능
- ✅ 참석 표시한 멤버가 라인업 선택기 상단에 자동 정렬
- ✅ 참석자에게 "참석" 배지(초록색) 표시
- ✅ 매니저가 쉽게 참석자를 식별하고 선택 가능

#### 구현 파일
- `src/app/(protected)/matches/[id]/lineup-selector.tsx` - 라인업 선택기
  - `attendingMemberIds` prop 추가
  - 참석자 우선 정렬 로직 구현
  - 참석 배지 UI 추가

#### 정렬 로직
```typescript
const sortedMembers = [...activeMembers].sort((a, b) => {
  const aAttending = attendingMemberIds.includes(a.id);
  const bAttending = attendingMemberIds.includes(b.id);
  if (aAttending && !bAttending) return -1;
  if (!aAttending && bAttending) return 1;
  return 0;
});
```

---

## 📁 생성/수정된 파일

### 새로 생성된 파일

1. **참석 버튼 컴포넌트**
   - `src/app/(protected)/matches/[id]/attendance-button.tsx`

2. **테스트 스크립트**
   - `scripts/create-test-users.ts`

3. **문서**
   - `docs/TESTING_GUIDE.md`
   - `docs/FEATURE_SUMMARY.md`

### 수정된 파일

1. **서버 액션**
   - `src/services/matches.ts`
     - `getMatchAttendance()` 추가
     - `updateAttendance()` 추가
     - `getAttendingMembers()` 추가
     - `MatchAttendanceWithMember` 타입 추가

2. **경기 상세 페이지**
   - `src/app/(protected)/matches/[id]/page.tsx`
     - 참석 정보 로딩
     - AttendanceButton 컴포넌트 추가
     - attendingMemberIds를 LineupSelector에 전달

3. **라인업 선택기**
   - `src/app/(protected)/matches/[id]/lineup-selector.tsx`
     - attendingMemberIds prop 추가
     - 참석자 우선 정렬 로직
     - 참석 배지 UI 추가

---

## 🔄 데이터 흐름

### 팀 가입 플로우
```
사용자 → 가입 신청 버튼 클릭
    ↓
requestJoinTeam() 서버 액션
    ↓
team_members 테이블에 { status: 'pending' } 레코드 생성
    ↓
팀 매니저가 "팀원 관리" 페이지에서 확인
    ↓
승인: approveMember() → status: 'active'
거부: rejectMember() → 레코드 삭제
    ↓
트리거로 팀원 수 자동 업데이트
```

### 경기 참석 플로우
```
팀원 → 경기 상세 페이지 접속
    ↓
getMatchAttendance() → 기존 참석 정보 로딩
    ↓
참석 버튼 클릭 (참석/미정/불참)
    ↓
낙관적 UI 업데이트 (즉시 색상 변경)
    ↓
updateAttendance() 서버 액션
    ↓
match_attendance 테이블에 upsert
    ↓
revalidatePath로 캐시 무효화
```

### 라인업 우선 표시 플로우
```
매니저 → 경기 상세 페이지 접속
    ↓
getAttendingMembers() → 참석 중인 team_member_id 배열
    ↓
LineupSelector 컴포넌트
    ↓
sortedMembers: 참석자를 상단에 정렬
    ↓
UI 렌더링: 참석자에게 "참석" 배지 표시
```

---

## 🎨 UI/UX 개선사항

### 참석 버튼
- **디자인**: 3가지 상태를 구분하는 색상 체계
  - 참석: 초록색 (#00e677) + Check 아이콘
  - 미정: 회색 + HelpCircle 아이콘
  - 불참: 빨간색 + X 아이콘
- **인터랙션**: 클릭 시 즉시 색상 변경 (낙관적 업데이트)
- **접근성**: 명확한 아이콘과 텍스트 레이블

### 라인업 선택기
- **시각적 구분**: 참석자에게 초록색 "참석" 배지
- **스마트 정렬**: 참석자가 항상 상단에 표시
- **효율성**: 매니저가 참석자를 빠르게 식별하고 선택 가능

### 팀원 관리
- **직관적인 UI**: 승인/거부 버튼이 명확하게 표시
- **실시간 업데이트**: 승인 즉시 활성 팀원 목록으로 이동
- **배지 시스템**: 대기 중인 멤버 수를 배지로 표시

---

## 🧪 테스트 방법

### 자동 테스트 계정 생성

```bash
# Service Role Key를 .env에 추가
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 테스트 계정 5개 생성
npx tsx scripts/create-test-users.ts
```

### 수동 테스트 시나리오

상세한 테스트 가이드는 `docs/TESTING_GUIDE.md` 참조

1. **팀장 계정** (test1@example.com)
   - 팀 생성
   - 경기 생성
   - 가입 신청 승인
   - 라인업 선택

2. **선수 계정** (test2-5@example.com)
   - 팀 가입 신청
   - 경기 참석 버튼 클릭
   - 참석 상태 변경

---

## 🔐 보안 및 권한

### Row Level Security (RLS)

1. **team_members 테이블**
   - 사용자는 pending 상태로만 가입 신청 가능
   - OWNER/MANAGER만 멤버 관리 가능

2. **match_attendance 테이블**
   - 모든 사용자가 참석 정보 조회 가능
   - 팀 멤버만 자신의 참석 상태 업데이트 가능
   - OWNER/MANAGER는 모든 참석 정보 관리 가능

### 서버 측 검증

- 모든 서버 액션에서 사용자 인증 확인
- 팀 멤버십 유효성 검증
- 역할 기반 권한 체크

---

## 📊 성능 최적화

1. **낙관적 UI 업데이트**
   - 참석 버튼 클릭 시 즉시 UI 업데이트
   - 백그라운드에서 서버 요청 처리

2. **효율적인 쿼리**
   - `getAttendingMembers()`: 필요한 ID만 조회
   - JOIN으로 여러 테이블 한 번에 가져오기

3. **캐시 전략**
   - `revalidatePath()`로 관련 페이지만 무효화
   - 불필요한 전체 페이지 새로고침 방지

---

## 🚀 다음 단계 제안

### 추가 개선 가능한 기능

1. **참석 통계**
   - 팀원별 참석률 통계
   - 경기별 참석자 수 차트

2. **알림 시스템**
   - 가입 승인/거부 알림
   - 경기 참석 리마인더

3. **참석 코멘트**
   - 참석 상태에 코멘트 추가 (예: "30분 늦을 것 같아요")

4. **출석 자동 체크**
   - QR 코드로 현장 출석 체크
   - GPS 기반 자동 출석

---

## 📝 참고 문서

- **테스트 가이드**: `docs/TESTING_GUIDE.md`
- **완료된 작업 목록**: `docs/COMPLETED_WORK.md`
- **API 문서**: `src/services/matches.ts`, `src/services/teams.ts`

---

## ✨ 요약

이번 구현으로 다음 기능들이 완전히 작동합니다:

✅ **팀 가입 시스템**
- 가입 신청 → 승인/거부 플로우
- 역할 기반 권한 관리
- 자동 팀원 수 업데이트

✅ **경기 참석 시스템**
- 3가지 참석 상태 관리
- 낙관적 UI 업데이트
- 실시간 상태 변경

✅ **라인업 자동 우선 표시**
- 참석자 상단 정렬
- 시각적 배지 표시
- 효율적인 팀 구성

모든 기능이 TypeScript 빌드를 통과했으며, 프로덕션 준비가 완료되었습니다.
