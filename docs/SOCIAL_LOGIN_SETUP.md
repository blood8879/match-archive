# 소셜 로그인 설정 가이드

이 문서는 Match Archive 프로젝트에서 Google 및 Kakao 소셜 로그인을 설정하는 방법을 설명합니다.

## 목차

1. [Google 로그인 설정](#google-로그인-설정)
2. [Kakao 로그인 설정](#kakao-로그인-설정)
3. [Supabase 설정](#supabase-설정)
4. [환경 변수](#환경-변수)
5. [코드 구현](#코드-구현)
6. [트러블슈팅](#트러블슈팅)

---

## Google 로그인 설정

### 1. Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. **API 및 서비스** > **사용자 인증 정보**로 이동
4. **사용자 인증 정보 만들기** > **OAuth 클라이언트 ID** 선택

### 2. OAuth 동의 화면 구성

1. **OAuth 동의 화면** 탭으로 이동
2. 사용자 유형: **외부** 선택
3. 앱 정보 입력:
   - 앱 이름: `Match Archive`
   - 사용자 지원 이메일: 본인 이메일
   - 개발자 연락처 정보: 본인 이메일
4. 범위(Scopes) 추가:
   - `email`
   - `profile`
   - `openid`

### 3. OAuth 클라이언트 ID 생성

1. 애플리케이션 유형: **웹 애플리케이션**
2. 이름: `Match Archive Web Client`
3. **승인된 리디렉션 URI** 추가:
   ```
   https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
   ```
   - 예: `https://maulhqmrvdyanywasahc.supabase.co/auth/v1/callback`
4. **만들기** 클릭
5. **클라이언트 ID**와 **클라이언트 보안 비밀번호** 저장

---

## Kakao 로그인 설정

### 1. Kakao Developers 설정

1. [Kakao Developers](https://developers.kakao.com/)에 접속
2. **내 애플리케이션** > **애플리케이션 추가하기** 클릭
3. 앱 정보 입력:
   - 앱 이름: `Match Archive`
   - 사업자명: 본인 이름 또는 회사명

### 2. 앱 키 확인

1. 생성된 앱 클릭 > **앱 키** 탭
2. **REST API 키** 복사 (이것이 Client ID)

### 3. 플랫폼 등록

1. **앱 설정** > **플랫폼** 이동
2. **Web 플랫폼 등록** 클릭
3. 사이트 도메인 추가:
   ```
   http://localhost:3000
   https://your-production-domain.com
   ```

### 4. Kakao 로그인 활성화

1. **제품 설정** > **카카오 로그인** 이동
2. **활성화 설정** ON
3. **Redirect URI** 등록:
   ```
   https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
   ```
   - 예: `https://maulhqmrvdyanywasahc.supabase.co/auth/v1/callback`

### 5. 동의 항목 설정

1. **카카오 로그인** > **동의항목** 이동
2. 필수 동의 항목 설정:
   - **닉네임**: 필수 동의
   - **프로필 사진**: 선택 동의
   - **카카오계정(이메일)**: 필수 동의 (비즈 앱 전환 필요할 수 있음)

### 6. 보안 설정 (Client Secret)

1. **제품 설정** > **카카오 로그인** > **보안** 이동
2. **Client Secret** 코드 생성
3. 생성된 코드 복사 (이것이 Client Secret)
4. **활성화 상태**: ON

---

## Supabase 설정

### 1. Google Provider 설정

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택 > **Authentication** > **Providers**
3. **Google** 클릭하여 확장
4. **Enable Sign in with Google** 토글 ON
5. 정보 입력:
   - **Client ID**: Google Cloud Console에서 복사한 클라이언트 ID
   - **Client Secret**: Google Cloud Console에서 복사한 클라이언트 보안 비밀번호
6. **Save** 클릭

### 2. Kakao Provider 설정

1. **Authentication** > **Providers** > **Kakao**
2. **Enable Sign in with Kakao** 토글 ON
3. 정보 입력:
   - **Client ID**: Kakao REST API 키
   - **Client Secret**: Kakao Client Secret 코드
4. **Save** 클릭

### 3. Redirect URL 확인

Supabase의 Redirect URL은 다음 형식입니다:
```
https://<PROJECT_REF>.supabase.co/auth/v1/callback
```

이 URL을 Google Cloud Console과 Kakao Developers에 정확히 등록해야 합니다.

---

## 환경 변수

`.env` 파일에 다음 환경 변수가 설정되어 있어야 합니다:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<YOUR_PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_ANON_KEY>
```

> **참고**: Google/Kakao의 Client ID와 Secret은 Supabase Dashboard에서 설정하므로 별도의 환경 변수가 필요하지 않습니다.

---

## 코드 구현

### 소셜 로그인 함수

```typescript
// src/app/(auth)/login/page.tsx

const handleSocialLogin = async (provider: "google" | "kakao") => {
  const supabase = createClient();
  await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
};
```

### OAuth 콜백 처리

```typescript
// src/app/auth/callback/route.ts

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 프로필 완성 여부 확인 후 리다이렉트
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("nickname")
          .eq("id", user.id)
          .single();

        const isProfileComplete = profile?.nickname?.trim();

        if (!isProfileComplete) {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
```

### 로그인 버튼 UI

```tsx
// Google 로그인 버튼
<button
  type="button"
  onClick={() => handleSocialLogin("google")}
  className="flex items-center justify-center gap-2 rounded-xl h-12 border border-[#2e6b4e] bg-[#173627] hover:bg-[#1e4532] text-white transition-all font-medium text-sm"
>
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.283 10.356h-8.327v3.451h4.792c-.446 2.193-2.313 3.453-4.792 3.453a5.27 5.27 0 0 1-5.279-5.28 5.27 5.27 0 0 1 5.279-5.279c1.259 0 2.397.447 3.29 1.178l2.6-2.599c-1.584-1.381-3.615-2.233-5.89-2.233a8.908 8.908 0 0 0-8.934 8.934 8.907 8.907 0 0 0 8.934 8.934c4.467 0 8.529-3.249 8.529-8.934 0-.528-.081-1.097-.202-1.625z" />
  </svg>
  Google
</button>

// Kakao 로그인 버튼
<button
  type="button"
  onClick={() => handleSocialLogin("kakao")}
  className="flex items-center justify-center gap-2 rounded-xl h-12 border border-[#2e6b4e] bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] transition-all font-medium text-sm"
>
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3C6.477 3 2 6.463 2 10.742c0 2.748 1.826 5.165 4.586 6.546-.152.537-.978 3.453-.999 3.669 0 0-.02.166.088.23.108.063.235.013.235.013.31-.043 3.586-2.355 4.153-2.761.614.089 1.251.135 1.906.135 5.523 0 10-3.463 10-7.832C22 6.463 17.523 3 12 3z"/>
  </svg>
  카카오
</button>
```

---

## 트러블슈팅

### 1. "redirect_uri_mismatch" 오류

**원인**: OAuth 제공자에 등록된 Redirect URI와 실제 요청 URI가 일치하지 않음

**해결**:
1. Supabase Dashboard에서 Callback URL 확인
2. Google Cloud Console / Kakao Developers에 정확한 URI 등록
3. URI 끝에 슬래시(/) 유무 확인

### 2. Kakao 이메일 가져오기 실패

**원인**: Kakao 비즈 앱 전환이 필요하거나 동의항목 설정 누락

**해결**:
1. Kakao Developers > 앱 설정 > 비즈 앱 전환
2. 동의항목에서 "카카오계정(이메일)" 필수 동의로 설정

### 3. 로그인 후 빈 화면

**원인**: OAuth 콜백 처리 오류

**해결**:
1. `/auth/callback/route.ts` 파일 확인
2. `exchangeCodeForSession` 에러 로깅 추가
3. Supabase 로그 확인 (Dashboard > Logs > Auth)

### 4. CORS 오류

**원인**: 도메인이 허용 목록에 없음

**해결**:
1. Supabase Dashboard > Authentication > URL Configuration
2. Site URL 및 Redirect URLs에 도메인 추가

---

## 참고 자료

- [Supabase Auth - Social Login](https://supabase.com/docs/guides/auth/social-login)
- [Google OAuth 2.0 문서](https://developers.google.com/identity/protocols/oauth2)
- [Kakao 로그인 개발 가이드](https://developers.kakao.com/docs/latest/ko/kakaologin/common)
