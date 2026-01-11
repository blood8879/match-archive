"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { User, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const handleSocialLogin = async (provider: "google" | "github") => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0f2319]">
      <header className="w-full border-b border-[#2e6b4e] bg-[#0f2319]/50 backdrop-blur-md sticky top-0 z-50">
        <div className="px-6 md:px-10 py-4 flex items-center justify-between max-w-[960px] mx-auto w-full">
          <Link href="/" className="flex items-center gap-4 text-white hover:opacity-80 transition-opacity">
            <div className="size-8 text-[#00e677]">
              <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_6_535)">
                  <path clipRule="evenodd" d="M47.2426 24L24 47.2426L0.757355 24L24 0.757355L47.2426 24ZM12.2426 21H35.7574L24 9.24264L12.2426 21Z" fill="currentColor" fillRule="evenodd"></path>
                </g>
                <defs>
                  <clipPath id="clip0_6_535"><rect fill="white" height="48" width="48"></rect></clipPath>
                </defs>
              </svg>
            </div>
            <h2 className="text-white text-xl font-bold leading-tight tracking-[-0.015em]">Match Archive</h2>
          </Link>
          <Link href="#" className="text-[#8dceae] hover:text-white text-sm font-medium transition-colors hidden sm:block">
            도움이 필요하신가요?
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#00e677]/5 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00e677]/10 rounded-full blur-[120px]"></div>
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMMCAwTDQwIDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzJlNmI0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIiAvPjwvc3ZnPg==")`
            }}
          ></div>
        </div>

        <div className="flex flex-col max-w-[480px] w-full bg-[#0f2319]/80 backdrop-blur-sm border border-[#2e6b4e] rounded-xl shadow-2xl relative z-10 overflow-hidden">
          <div className="pt-8 px-6 text-center">
            <h1 className="text-white tracking-tight text-[32px] font-bold leading-tight pb-2">환영합니다</h1>
            <p className="text-[#8dceae] text-base font-normal leading-normal px-4">
              팀의 기록과 통계를 관리하세요.
            </p>
          </div>

          <div className="pt-6 px-6">
            <div className="flex border-b border-[#2e6b4e] justify-between">
              <Link
                href="/login"
                className="flex flex-col items-center justify-center border-b-[3px] border-b-[#00e677] text-white pb-3 pt-2 flex-1 hover:bg-[#173627]/50 transition-colors rounded-t-lg"
              >
                <p className="text-white text-sm font-bold leading-normal tracking-[0.015em]">로그인</p>
              </Link>
              <Link
                href="/signup"
                className="flex flex-col items-center justify-center border-b-[3px] border-b-transparent text-[#8dceae] pb-3 pt-2 flex-1 hover:text-white hover:bg-[#173627]/50 transition-colors rounded-t-lg"
              >
                <p className="text-inherit text-sm font-bold leading-normal tracking-[0.015em]">회원가입</p>
              </Link>
            </div>
          </div>

          <form className="flex flex-col gap-5 px-6 py-6" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2">
              <span className="text-white text-base font-medium leading-normal">이메일 또는 사용자 이름</span>
              <div className="relative">
                <input
                  className="flex w-full resize-none overflow-hidden rounded-xl text-white focus:outline-0 focus:ring-2 focus:ring-[#00e677]/50 border border-[#2e6b4e] bg-[#173627] focus:border-[#00e677] h-14 placeholder:text-[#8dceae]/50 p-[15px] pr-12 text-base font-normal leading-normal transition-all"
                  placeholder="user@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <User className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8dceae] pointer-events-none w-5 h-5" />
              </div>
            </label>

            <label className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-white text-base font-medium leading-normal">비밀번호</span>
              </div>
              <div className="relative">
                <input
                  className="flex w-full resize-none overflow-hidden rounded-xl text-white focus:outline-0 focus:ring-2 focus:ring-[#00e677]/50 border border-[#2e6b4e] bg-[#173627] focus:border-[#00e677] h-14 placeholder:text-[#8dceae]/50 p-[15px] pr-12 text-base font-normal leading-normal transition-all"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8dceae] hover:text-white transition-colors flex items-center justify-center"
                >
                  {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>
              <div className="flex justify-end pt-1">
                <Link href="#" className="text-sm font-medium text-[#00e677] hover:text-[#00e677]/80 transition-colors">
                  비밀번호 찾기
                </Link>
              </div>
            </label>

            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}

            <div className="pt-2 flex flex-col gap-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 bg-[#00e677] hover:bg-[#00c966] text-[#0f241a] text-base font-bold leading-normal tracking-[0.015em] transition-all shadow-lg shadow-[#00e677]/20 active:scale-[0.99] disabled:opacity-50"
              >
                <span className="truncate">{isLoading ? "로그인 중..." : "로그인"}</span>
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-[#2e6b4e]"></div>
                <span className="flex-shrink-0 mx-4 text-[#8dceae] text-xs uppercase font-bold tracking-wider">또는 다음으로 계속</span>
                <div className="flex-grow border-t border-[#2e6b4e]"></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSocialLogin("google")}
                  className="flex items-center justify-center gap-2 rounded-xl h-12 border border-[#2e6b4e] bg-[#173627] hover:bg-[#1e4532] text-white transition-all font-medium text-sm"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.283 10.356h-8.327v3.451h4.792c-.446 2.193-2.313 3.453-4.792 3.453a5.27 5.27 0 0 1-5.279-5.28 5.27 5.27 0 0 1 5.279-5.279c1.259 0 2.397.447 3.29 1.178l2.6-2.599c-1.584-1.381-3.615-2.233-5.89-2.233a8.908 8.908 0 0 0-8.934 8.934 8.907 8.907 0 0 0 8.934 8.934c4.467 0 8.529-3.249 8.529-8.934 0-.528-.081-1.097-.202-1.625z"></path>
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialLogin("github")}
                  className="flex items-center justify-center gap-2 rounded-xl h-12 border border-[#2e6b4e] bg-[#173627] hover:bg-[#1e4532] text-white transition-all font-medium text-sm"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.84 9.49.5.09.68-.22.68-.48 0-.24-.01-.88-.01-1.73-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02.8-.22 1.65-.33 2.5-.33.85 0 1.7.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.65.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .26.18.58.69.48A10.01 10.01 0 0 0 22 12c0-5.523-4.477-10-10-10z"></path>
                  </svg>
                  GitHub
                </button>
              </div>
            </div>
          </form>

          <div className="pb-6 text-center">
            <p className="text-[#8dceae] text-sm">
              아직 팀 계정이 없으신가요?{" "}
              <Link href="/signup" className="text-[#00e677] hover:underline font-bold">
                회원가입
              </Link>
            </p>
          </div>
        </div>
      </main>

      <footer className="w-full py-6 border-t border-[#2e6b4e] mt-auto bg-[#0f2319]/50 z-10 relative">
        <div className="px-10 flex justify-center">
          <p className="text-[#8dceae]/60 text-xs text-center">© 2024 Match Archive. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
