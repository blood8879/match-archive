# 이미지 업로드 기능 추가 - Changelog

## 날짜: 2026-01-11

## 요약
팀 생성 및 프로필 설정에 이미지 업로드 기능을 완전히 구현했습니다. Supabase Storage를 활용하여 안전하고 확장 가능한 이미지 저장 시스템을 구축했습니다.

## 추가된 기능

### 1. Supabase Storage Buckets
- ✅ `team-emblems`: 팀 엠블럼 저장 (5MB, JPG/PNG/WebP/SVG)
- ✅ `user-avatars`: 사용자 아바타 저장 (5MB, JPG/PNG/WebP)
- ✅ RLS 정책 설정으로 보안 강화

### 2. 팀 생성 페이지 (`/teams/new`)
- ✅ 이미지 선택 UI 추가
- ✅ 실시간 미리보기 기능
- ✅ 파일 크기 및 형식 검증
- ✅ Supabase Storage 자동 업로드
- ✅ 에러 처리 및 사용자 피드백

### 3. 프로필 설정 페이지 (`/profile`)
- ✅ 아바타 업로드 UI 추가
- ✅ 기존 이미지 표시
- ✅ 새 이미지 업로드 시 기존 이미지 자동 삭제
- ✅ 실시간 미리보기 기능
- ✅ 파일 검증 및 에러 처리

## 변경된 파일

### 신규 파일
1. `src/lib/storage.ts` - 이미지 업로드 유틸리티 함수 (선택사항)
2. `supabase/migrations/008_create_storage_buckets.sql` - Storage bucket 생성
3. `supabase/migrations/009_update_create_team_with_emblem.sql` - 팀 생성 함수 업데이트
4. `docs/IMAGE_UPLOAD_FEATURE.md` - 기능 상세 문서

### 수정된 파일
1. `src/app/(protected)/teams/new/page.tsx`
   - 엠블럼 미리보기 state 추가
   - 파일 변경 핸들러 구현
   - UI 업데이트 (미리보기 표시)

2. `src/app/(protected)/profile/profile-form.tsx`
   - 아바타 업로드 UI 추가
   - 이미지 업로드 및 삭제 로직
   - 미리보기 기능

3. `src/services/teams.ts`
   - `createTeam` 함수에 이미지 업로드 로직 추가
   - 파일 검증 및 Storage 업로드
   - emblem_url DB 저장

4. `src/app/(protected)/matches/[id]/page.tsx`
   - TypeScript 타입 오류 수정 (opponentPlayers)

## 데이터베이스 변경사항

### 마이그레이션
```sql
-- 008_create_storage_buckets.sql
- team-emblems 버킷 생성
- user-avatars 버킷 생성
- RLS 정책 설정 (SELECT, INSERT, UPDATE, DELETE)

-- 009_update_create_team_with_emblem.sql
- create_team_with_owner 함수에 p_emblem_url 파라미터 추가
```

## 보안 기능

1. **파일 크기 제한**: 최대 5MB
2. **파일 타입 검증**:
   - 팀 엠블럼: JPG, PNG, WebP, SVG
   - 사용자 아바타: JPG, PNG, WebP
3. **RLS 정책**:
   - 조회: 모든 사용자
   - 업로드: 인증된 사용자만
   - 수정/삭제: 본인 파일만
4. **사용자 격리**: 각 사용자의 폴더에 파일 저장

## 파일 저장 구조
```
team-emblems/
└── {user_id}/
    └── {timestamp}_{random}.{ext}

user-avatars/
└── {user_id}/
    └── {timestamp}_{random}.{ext}
```

## 테스트 완료 항목

- ✅ TypeScript 컴파일 성공
- ✅ Next.js 빌드 성공
- ✅ Storage bucket 생성 확인
- ✅ Migration 적용 완료
- ✅ RLS 정책 적용 확인

## 사용 방법

### 팀 엠블럼 업로드
```
1. /teams/new 페이지 접속
2. 엠블럼 영역 클릭
3. 이미지 파일 선택 (5MB 이하)
4. 미리보기 확인
5. 팀 정보 입력 후 생성
```

### 프로필 사진 업로드
```
1. /profile 페이지 접속
2. 아바tar 영역 클릭
3. 이미지 파일 선택 (5MB 이하)
4. 미리보기 확인
5. 프로필 정보 수정 후 저장
```

## 다음 단계 (선택사항)

- [ ] 이미지 자동 리사이징 구현
- [ ] 이미지 압축 기능
- [ ] 크롭 기능 추가
- [ ] 드래그 앤 드롭 UI 개선
- [ ] 프로그레스 바 추가

## 기술 스택

- Next.js 16 (App Router)
- Supabase Storage
- TypeScript
- React Hooks (useState, useTransition)
- FormData API
- FileReader API

## 참고 문서

- [IMAGE_UPLOAD_FEATURE.md](./docs/IMAGE_UPLOAD_FEATURE.md) - 상세 기능 문서
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
