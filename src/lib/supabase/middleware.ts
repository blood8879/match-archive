import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup") ||
    request.nextUrl.pathname === "/";

  const isOnboardingPage = request.nextUrl.pathname.startsWith("/onboarding");

  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/teams") ||
    request.nextUrl.pathname.startsWith("/matches") ||
    request.nextUrl.pathname.startsWith("/profile") ||
    request.nextUrl.pathname.startsWith("/settings") ||
    request.nextUrl.pathname.startsWith("/players");

  // 로그인하지 않은 사용자가 보호된 경로 접근 시 로그인 페이지로
  if (!user && (isProtectedRoute || isOnboardingPage)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 로그인한 사용자가 보호된 경로 접근 시 프로필 완료 여부 체크
  if (user && (isProtectedRoute || isOnboardingPage)) {
    const { data: profile } = await supabase
      .from("users")
      .select("nickname, nationality, birth_date, preferred_foot")
      .eq("id", user.id)
      .single();

    const isProfileComplete =
      profile?.nickname &&
      profile.nickname.trim() !== "" &&
      profile?.nationality &&
      profile?.birth_date &&
      profile?.preferred_foot;

    // 프로필 미완료 상태에서 온보딩 페이지가 아닌 곳 접근 시 온보딩으로
    if (!isProfileComplete && !isOnboardingPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    // 프로필 완료 상태에서 온보딩 페이지 접근 시 대시보드로
    if (isProfileComplete && isOnboardingPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // 로그인한 사용자가 로그인/회원가입 페이지 접근 시 대시보드로
  if (user && isAuthPage && request.nextUrl.pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
