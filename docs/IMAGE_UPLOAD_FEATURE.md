# 이미지 업로드 기능 구현 완료

## 개요
팀 생성 및 프로필 설정 페이지에 이미지 업로드 기능을 추가했습니다. Supabase Storage를 활용하여 팀 엠블럼과 사용자 아바타를 안전하게 저장하고 관리합니다.

## 구현된 기능

### 1. Storage Bucket 생성
- **team-emblems**: 팀 엠블럼 저장용 버킷
  - 공개 접근 허용
  - 최대 파일 크기: 5MB
  - 지원 형식: JPG, PNG, WebP, SVG

- **user-avatars**: 사용자 아바타 저장용 버킷
  - 공개 접근 허용
  - 최대 파일 크기: 5MB
  - 지원 형식: JPG, PNG, WebP

### 2. 팀 생성 페이지 (`/teams/new`)
**위치**: `src/app/(protected)/teams/new/page.tsx`

**기능**:
- 팀 엠블럼 이미지 선택 및 미리보기
- 드래그 앤 드롭 또는 클릭으로 파일 선택
- 실시간 미리보기 표시
- 파일 크기 및 형식 검증 (5MB, JPG/PNG/WebP/SVG)
- Supabase Storage에 자동 업로드
- 팀 생성 시 emblem_url과 함께 저장

**변경사항**:
- 엠블럼 미리보기 state 추가
- 파일 변경 핸들러 추가
- UI에 실시간 미리보기 표시
- accept 속성으로 허용 형식 제한

### 3. 프로필 설정 페이지 (`/profile`)
**위치**: `src/app/(protected)/profile/profile-form.tsx`

**기능**:
- 프로필 사진 선택 및 미리보기
- 기존 아바타가 있으면 표시
- 새 이미지 업로드 시 기존 이미지 자동 삭제
- 파일 크기 및 형식 검증 (5MB, JPG/PNG/WebP)
- Supabase Storage에 자동 업로드
- 프로필 업데이트 시 avatar_url과 함께 저장

**변경사항**:
- 아바타 미리보기 및 파일 state 추가
- 파일 변경 핸들러 추가
- UI에 아바타 업로드 섹션 추가
- 기존 이미지 삭제 로직 추가

### 4. 팀 서비스 업데이트
**위치**: `src/services/teams.ts`

**변경사항**:
- `createTeam` 함수에 이미지 업로드 로직 추가
- FormData에서 emblem 파일 추출
- 파일 검증 (크기, 형식)
- Supabase Storage 업로드
- Public URL 생성 및 DB 저장

### 5. 데이터베이스 함수 업데이트
**Migration**: `supabase/migrations/20260111_update_create_team_with_emblem.sql`

**변경사항**:
- `create_team_with_owner` 함수에 `p_emblem_url` 파라미터 추가
- 팀 생성 시 emblem_url 저장

## 파일 구조

```
match-archive/
├── src/
│   ├── lib/
│   │   └── storage.ts                         # 이미지 업로드 유틸리티 (선택사항)
│   ├── services/
│   │   └── teams.ts                           # 팀 서비스 (업데이트됨)
│   └── app/
│       └── (protected)/
│           ├── teams/
│           │   └── new/
│           │       └── page.tsx               # 팀 생성 페이지 (업데이트됨)
│           └── profile/
│               └── profile-form.tsx           # 프로필 폼 (업데이트됨)
└── supabase/
    └── migrations/
        ├── 20260111_create_storage_buckets.sql
        └── 20260111_update_create_team_with_emblem.sql
```

## Storage 정책 (RLS)

### team-emblems 버킷
- **SELECT**: 모든 사용자 (public read)
- **INSERT**: 인증된 사용자만
- **UPDATE/DELETE**: 본인이 업로드한 파일만 (user_id 기반)

### user-avatars 버킷
- **SELECT**: 모든 사용자 (public read)
- **INSERT**: 본인 폴더에만 업로드 가능
- **UPDATE/DELETE**: 본인이 업로드한 파일만

## 파일 저장 구조

```
team-emblems/
└── {user_id}/
    └── {timestamp}_{random}.{ext}

user-avatars/
└── {user_id}/
    └── {timestamp}_{random}.{ext}
```

## 보안 기능

1. **파일 크기 제한**: 최대 5MB
2. **파일 타입 검증**: MIME 타입 검사
3. **인증 요구**: 업로드는 로그인한 사용자만 가능
4. **사용자 격리**: 각 사용자의 파일은 별도 폴더에 저장
5. **RLS 정책**: 데이터베이스 레벨에서 접근 제어

## 사용 방법

### 팀 엠블럼 업로드
1. `/teams/new` 페이지로 이동
2. 엠블럼 영역 클릭
3. 이미지 파일 선택 (JPG, PNG, WebP, SVG)
4. 미리보기 확인
5. 팀 정보 입력 후 "팀 생성" 버튼 클릭

### 프로필 사진 업로드
1. `/profile` 페이지로 이동
2. 아바타 영역 클릭
3. 이미지 파일 선택 (JPG, PNG, WebP)
4. 미리보기 확인
5. 프로필 정보 수정 후 "저장" 버튼 클릭

## 기술 스택

- **Storage**: Supabase Storage
- **Frontend**: Next.js 16 (App Router)
- **UI**: React with TypeScript
- **File Upload**: FormData API
- **Image Preview**: FileReader API

## 에러 처리

- 파일 크기 초과 시: "파일 크기는 5MB를 초과할 수 없습니다"
- 지원되지 않는 형식: "지원되지 않는 이미지 형식입니다"
- 업로드 실패: "이미지 업로드 실패: {에러 메시지}"

## 향후 개선 사항

1. 이미지 자동 리사이징 (서버 측 처리)
2. 이미지 압축 기능
3. 크롭 기능 추가
4. 드래그 앤 드롭 지원
5. 여러 이미지 업로드 지원

## 테스트 방법

1. 개발 서버 실행: `npm run dev`
2. 팀 생성 페이지로 이동
3. 5MB 이하의 이미지 파일 업로드 테스트
4. 프로필 페이지에서 아바타 업로드 테스트
5. Supabase Dashboard에서 Storage 확인

## 관련 링크

- [Supabase Storage 문서](https://supabase.com/docs/guides/storage)
- [Next.js File Upload](https://nextjs.org/docs/app/building-your-application/routing/route-handlers#request-body-formdata)
