# 푸시 알림 설정 가이드

Match Archive 앱에서 웹 푸시 알림을 활성화하기 위한 OneSignal 설정 가이드입니다.

## 목차

1. [OneSignal 계정 생성](#1-onesignal-계정-생성)
2. [앱 생성 및 설정](#2-앱-생성-및-설정)
3. [환경 변수 설정](#3-환경-변수-설정)
4. [기능 테스트](#4-기능-테스트)
5. [트러블슈팅](#5-트러블슈팅)

---

## 1. OneSignal 계정 생성

1. [OneSignal](https://onesignal.com/) 접속
2. **Sign Up** 클릭하여 계정 생성
3. 이메일 인증 완료

## 2. 앱 생성 및 설정

### 2.1 새 앱 생성

1. OneSignal 대시보드에서 **New App/Website** 클릭
2. 앱 이름 입력 (예: `Match Archive`)
3. **Web** 플랫폼 선택

### 2.2 웹 설정 구성

**Site Setup** 단계에서:

| 필드 | 값 |
|------|-----|
| Site Name | `Match Archive` (또는 원하는 이름) |
| Site URL | `https://your-domain.com` (프로덕션 도메인) |
| Local Testing | 개발 중이라면 `http://localhost:3000` 추가 |

**Permission Prompt Setup**:
- **Push Slide Prompt** 비활성화 (앱 내에서 직접 처리)
- **Subscription Bell** 비활성화

### 2.3 API 키 확인

1. **Settings** > **Keys & IDs** 이동
2. 다음 값들을 복사:
   - **OneSignal App ID** (공개키)
   - **Rest API Key** (비밀키 - 절대 클라이언트에 노출하지 마세요)

## 3. 환경 변수 설정

프로젝트 루트의 `.env` 파일을 수정합니다:

```env
# OneSignal Push Notifications
NEXT_PUBLIC_ONESIGNAL_APP_ID=your_actual_app_id_here
ONESIGNAL_REST_API_KEY=your_actual_rest_api_key_here
```

**중요**: 
- `NEXT_PUBLIC_` 접두사가 붙은 변수는 클라이언트에 노출됩니다
- `ONESIGNAL_REST_API_KEY`는 서버에서만 사용되며 절대 노출되면 안 됩니다

### Vercel/Production 배포 시

Vercel 대시보드에서:
1. **Settings** > **Environment Variables** 이동
2. 위 두 변수를 추가

## 4. 기능 테스트

### 4.1 개발 서버 실행

```bash
npm run dev
```

### 4.2 푸시 알림 구독 테스트

1. `http://localhost:3000/dashboard` 접속
2. 상단에 **"푸시 알림을 켜보세요"** 배너 확인
3. **"알림 켜기"** 클릭
4. 브라우저 알림 권한 허용

### 4.3 설정 페이지에서 토글

1. `http://localhost:3000/settings` 접속
2. 하단 **"푸시 알림"** 토글 확인
3. 토글로 구독/해지 테스트

### 4.4 경기 생성 알림 테스트

1. 팀 페이지에서 **경기 등록**
2. 같은 팀의 다른 멤버(다른 브라우저/기기)에서 푸시 알림 수신 확인

## 5. 트러블슈팅

### 알림이 오지 않는 경우

| 증상 | 해결책 |
|------|--------|
| 배너/토글이 안 보임 | 브라우저가 Push API 지원하는지 확인 (Safari iOS는 PWA 필요) |
| 권한 요청이 안 뜸 | 브라우저 설정에서 해당 사이트 알림 차단 해제 |
| 구독은 되는데 알림이 안 옴 | OneSignal 대시보드 > Delivery > Message Reports 확인 |
| "OneSignal not configured" 로그 | `.env` 파일의 키가 플레이스홀더인지 확인 |

### 브라우저 지원 현황

| 브라우저 | 데스크톱 | 모바일 |
|---------|---------|--------|
| Chrome | ✅ | ✅ (Android) |
| Firefox | ✅ | ✅ (Android) |
| Edge | ✅ | ✅ |
| Safari | ✅ (macOS 13+) | ⚠️ (iOS 16.4+, PWA 필요) |

### iOS Safari 제한사항

iOS에서 푸시 알림을 받으려면:
1. iOS 16.4 이상 필요
2. 사이트를 **홈 화면에 추가** (PWA로 설치)
3. PWA에서 알림 권한 허용

### OneSignal 대시보드에서 테스트 알림 보내기

1. OneSignal 대시보드 > **Messages** > **New Push**
2. **Audience**: Test Users 또는 특정 사용자
3. 메시지 작성 후 **Send**

---

## 구현된 알림 종류

| 알림 유형 | 트리거 | 수신 대상 |
|----------|--------|----------|
| 경기 생성 | 새 경기 등록 시 | 해당 팀 전체 멤버 (생성자 제외) |
| 팀 초대 | 팀 초대 발송 시 | 초대받은 사용자 |
| 가입 승인 | 가입 요청 승인 시 | 승인된 사용자 |
| 경기 변경 | 경기 일정 변경 시 | 해당 팀 전체 멤버 |

## 관련 파일

```
src/
├── services/
│   └── push-notifications.ts    # 서버 푸시 서비스
├── components/
│   ├── providers/
│   │   └── onesignal-provider.tsx  # OneSignal SDK 초기화
│   └── push-notification-toggle.tsx # UI 컴포넌트
├── app/
│   └── api/push/send/route.ts   # API 엔드포인트
public/
└── OneSignalSDKWorker.js        # Service Worker
```
