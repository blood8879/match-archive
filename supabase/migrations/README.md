# Supabase 마이그레이션 가이드

이 문서는 Supabase 마이그레이션을 수동으로 적용하는 방법을 설명합니다.

## 개요

마이그레이션 파일들은 Supabase 데이터베이스 스키마를 단계적으로 구축합니다:

- `001_initial_schema.sql`: 초기 테이블, 타입, RLS 정책 설정
- `002_attendance_and_invites.sql`: 경기 참석 추적 및 팀 초대 기능 추가
- `003_fix_team_owner_rls.sql`: 팀 생성 시 소유자 추가 문제 해결

## 마이그레이션 003 - 팀 소유자 RLS 정책 수정

### 문제 배경

팀을 생성할 때 팀 소유자가 `team_members` 테이블에 자동으로 추가되지 않는 문제가 발생했습니다.

**원인:**
- "Team managers can manage members" 정책: 사용자가 이미 OWNER/MANAGER 역할이어야 함
- "Users can request to join teams" 정책: 'pending' 상태와 'MEMBER' 역할만 허용
- 두 정책 모두 팀 소유자가 OWNER 역할로 자신을 추가하는 것을 허용하지 않음

이는 순환 의존성 문제(Circular Dependency)로, 팀 소유자가 첫 번째 팀원으로 추가될 수 없습니다.

### 해결 방법

두 가지 솔루션이 포함됩니다:

#### 솔루션 1: 팀 소유자 자가 추가 정책
새로운 RLS 정책을 추가하여 팀 소유자가 자신을 OWNER 역할로 추가할 수 있게 합니다.

**특징:**
- 가볍고 간단한 구현
- 팀 소유자만 이 정책을 사용할 수 있음
- 기존 정책과 함께 작동

#### 솔루션 2: 원자적 팀 생성 함수
데이터베이스 함수를 사용하여 팀 생성과 팀원 추가를 하나의 트랜잭션으로 처리합니다.

**특징:**
- `SECURITY DEFINER` 사용으로 RLS 정책 우회
- 팀 생성과 팀원 추가가 원자적(atomic)으로 처리됨
- 더 안전하고 확장성 있는 방식

## 수동 적용 방법

### 단계 1: Supabase 대시보드 접속

1. [Supabase](https://supabase.com) 웹사이트 방문
2. 프로젝트에 로그인
3. 해당 프로젝트 선택

### 단계 2: SQL Editor 열기

1. 좌측 메뉴에서 **"SQL Editor"** 클릭
   - 또는 왼쪽 사이드바의 아이콘으로 이동
2. **"+ New Query"** 버튼 클릭
3. 새 쿼리 편집 창이 열림

### 단계 3: SQL 쿼리 복사 및 실행

#### 방법 A: 마이그레이션 파일에서 복사

1. `003_fix_team_owner_rls.sql` 파일 내용 전체 복사
2. SQL Editor의 쿼리 입력란에 붙여넣기
3. 우측 상단의 **"Run"** 버튼 클릭 또는 `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

#### 방법 B: 부분적으로 실행

필요에 따라 각 부분을 개별적으로 실행할 수 있습니다:

**1단계: 팀 소유자 자가 추가 정책 추가**

```sql
CREATE POLICY "Team owner can add self as first member" ON public.team_members
    FOR INSERT WITH CHECK (
        -- 사용자가 자신을 추가하는 경우
        user_id = auth.uid()
        -- 그리고 그들이 팀의 소유자인 경우
        AND EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.id = team_id
            AND t.owner_id = auth.uid()
        )
        -- 그리고 OWNER 역할을 가지는 경우
        AND role = 'OWNER'
        AND status = 'active'
    );
```

이것만 실행해도 기본적인 팀 생성 문제는 해결됩니다.

**2단계: 팀 생성 함수 추가 (선택사항)**

더 안전한 구현을 원한다면 함수를 추가합니다:

```sql
CREATE OR REPLACE FUNCTION public.create_team_with_owner(
    p_name TEXT,
    p_region TEXT DEFAULT NULL,
    p_code TEXT DEFAULT NULL
)
RETURNS public.teams AS $$
DECLARE
    v_team public.teams;
    v_user_id UUID;
BEGIN
    -- 현재 사용자 가져오기
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- 팀 생성
    INSERT INTO public.teams (name, region, owner_id, code)
    VALUES (p_name, p_region, v_user_id, COALESCE(p_code, substr(md5(random()::text), 1, 8)))
    RETURNING * INTO v_team;

    -- 소유자를 첫 번째 팀원으로 추가 (RLS 정책 우회)
    INSERT INTO public.team_members (team_id, user_id, role, status)
    VALUES (v_team.id, v_user_id, 'OWNER', 'active');

    RETURN v_team;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 인증된 사용자에게 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.create_team_with_owner(TEXT, TEXT, TEXT) TO authenticated;

-- 문서화 주석 추가
COMMENT ON FUNCTION public.create_team_with_owner IS
'팀을 생성하고 생성자를 소유자로 추가합니다.
SECURITY DEFINER를 사용하여 RLS 정책을 우회합니다.';
```

### 단계 4: 실행 결과 확인

- **성공**: "Success" 메시지 표시, 실행 시간 표시
- **오류**: 오류 메시지 표시, 수정 필요

만약 오류가 발생하면:
- 오류 메시지 확인
- SQL 문법 확인
- 이미 적용된 정책/함수인지 확인

## 적용 후 검증 방법

### 1. 정책 확인

다음 쿼리를 실행하여 새로운 정책이 추가되었는지 확인합니다:

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'team_members'
ORDER BY policyname;
```

**예상 결과:**
- `Team owner can add self as first member` (새로 추가됨)
- `Team managers can manage members`
- `Users can request to join teams`

### 2. 함수 확인 (선택사항)

함수를 추가한 경우 확인합니다:

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'create_team_with_owner';
```

**예상 결과:**
```
routine_name            | routine_type
------------------------+--------------
create_team_with_owner  | FUNCTION
```

### 3. 팀 생성 테스트

실제로 팀 생성이 작동하는지 테스트할 수 있습니다:

#### API를 통한 테스트 (권장)

```javascript
// JavaScript/TypeScript 예시
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 팀 생성 함수 사용
const { data: team, error } = await supabase.rpc('create_team_with_owner', {
    p_name: '테스트 팀',
    p_region: 'Seoul',
    p_code: 'TEST001'
})

if (error) {
    console.error('팀 생성 오류:', error)
} else {
    console.log('팀 생성 성공:', team)
}
```

#### SQL을 통한 직접 테스트

```sql
-- 현재 사용자로 팀 생성 테스트 (함수 사용)
SELECT * FROM public.create_team_with_owner('테스트팀', 'Seoul', 'TEST123');

-- 팀원이 올바르게 추가되었는지 확인
SELECT tm.id, tm.user_id, tm.role, tm.status
FROM public.team_members tm
JOIN public.teams t ON t.id = tm.team_id
WHERE t.name = '테스트팀';
```

### 4. 기존 데이터 확인

기존 팀들의 소유자가 팀원으로 등록되어 있는지 확인합니다:

```sql
SELECT
    t.id,
    t.name,
    t.owner_id,
    COUNT(tm.id) as member_count,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM public.team_members tm2
            WHERE tm2.team_id = t.id AND tm2.user_id = t.owner_id
        ) THEN '포함됨'
        ELSE '누락됨'
    END as owner_status
FROM public.teams t
LEFT JOIN public.team_members tm ON t.id = tm.team_id
GROUP BY t.id, t.name, t.owner_id
ORDER BY t.created_at;
```

## 마이그레이션 적용 순서

전체 마이그레이션을 처음부터 적용하는 경우 다음 순서를 따릅니다:

1. **001_initial_schema.sql** (필수)
   - 기본 테이블 및 RLS 정책 설정
   - 약 1-2분 소요

2. **002_attendance_and_invites.sql** (권장)
   - 경기 참석 추적 및 팀 초대 기능 추가
   - 약 30초 소요

3. **003_fix_team_owner_rls.sql** (권장)
   - 팀 생성 문제 해결
   - 약 10초 소요

각 마이그레이션은 이전 마이그레이션에 의존하므로 반드시 순서대로 적용해야 합니다.

## 자주 묻는 질문

### Q: 마이그레이션이 이미 적용되었는지 확인하려면?

```sql
-- 마이그레이션 003의 정책이 있는지 확인
SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Team owner can add self as first member'
) as migration_003_applied;
```

### Q: 마이그레이션을 되돌릴 수 있나요?

현재는 자동 롤백 기능이 없습니다. 필요시 수동으로 정책과 함수를 제거할 수 있습니다:

```sql
-- 정책 제거
DROP POLICY IF EXISTS "Team owner can add self as first member" ON public.team_members;

-- 함수 제거
DROP FUNCTION IF EXISTS public.create_team_with_owner(TEXT, TEXT, TEXT);
```

### Q: 함수와 정책 중 어떤 것을 사용해야 하나요?

**함수만 사용** (권장):
- 더 안전함
- 모든 로직이 한 곳에 집중됨
- 애플리케이션에서 `create_team_with_owner` 함수 사용

**정책만 사용**:
- 더 가볍고 간단함
- 기존 코드 수정 필요 없음
- 하지만 여전히 애플리케이션 로직에 의존

**둘 다 사용** (안전성 최우선):
- 정책: 혼동된 상황에서의 방어 수단
- 함수: 정상적인 팀 생성 경로

## 지원

마이그레이션 적용 중 문제가 발생하면:

1. 오류 메시지 전체 복사
2. SQL 쿼리와 함께 팀과 공유
3. Supabase 대시보드의 SQL Editor 탭에서 "Share query" 기능 사용

## 참고 자료

- [Supabase SQL Editor 문서](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [PostgreSQL RLS 정책](https://supabase.com/docs/guides/auth/row-level-security)
- [SQL 함수 생성](https://supabase.com/docs/guides/database/functions)
