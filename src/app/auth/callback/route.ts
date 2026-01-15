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
      // 프로필 완료 여부 체크
      const { data: { user } } = await supabase.auth.getUser();
      let redirectPath = next;

      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("nickname")
          .eq("id", user.id)
          .single();

        // 프로필 미완료 시 온보딩으로
        const isProfileComplete = profile?.nickname && profile.nickname.trim() !== "";
        if (!isProfileComplete) {
          redirectPath = "/onboarding";
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${redirectPath}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`);
      } else {
        return NextResponse.redirect(`${origin}${redirectPath}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
