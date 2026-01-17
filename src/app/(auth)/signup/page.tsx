"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Mail, Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    setIsLoading(true);

    const supabase = createClient();

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    router.push("/onboarding");
  };

  const handleSocialLogin = async (provider: "google" | "kakao") => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background-dark)]">
      <header className="w-full border-b border-[var(--border-dark)] bg-[var(--background-dark)]/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-6 md:px-10 py-4 flex items-center justify-between max-w-[960px] mx-auto w-full">
          <Link href="/" className="flex items-center gap-4 text-white hover:opacity-80 transition-opacity">
            <div className="size-8 text-[var(--primary)]">
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
          <Link href="#" className="text-[var(--text-muted)] hover:text-white text-sm font-medium transition-colors hidden sm:block">
            도움이 필요하신가요?
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[var(--primary)]/5 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--primary)]/10 rounded-full blur-[120px]"></div>
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMMCAwTDQwIDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzJlNmI0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIiAvPjwvc3ZnPg==")`
            }}
          ></div>
        </div>

        <div className="flex flex-col max-w-[480px] w-full bg-[var(--background-dark)]/80 backdrop-blur-sm border border-[var(--border-dark)] rounded-xl shadow-lg relative z-10 overflow-hidden animate-fade-in">
          <div className="pt-8 px-6 text-center">
            <h1 className="text-white tracking-tight text-[32px] font-bold leading-tight pb-2">계정 만들기</h1>
            <p className="text-[var(--text-muted)] text-base font-normal leading-normal px-4">
              팀의 기록과 통계를 관리하세요.
            </p>
          </div>

          <div className="pt-6 px-6">
            <div className="flex border-b border-[var(--border-dark)] justify-between">
              <Link
                href="/login"
                className="flex flex-col items-center justify-center border-b-[3px] border-b-transparent text-[var(--text-muted)] pb-3 pt-2 flex-1 hover:text-white hover:bg-[var(--surface-800)]/50 transition-colors rounded-t-lg"
              >
                <p className="text-inherit text-sm font-bold leading-normal tracking-[0.015em]">로그인</p>
              </Link>
              <Link
                href="/signup"
                className="flex flex-col items-center justify-center border-b-[3px] border-b-[var(--primary)] text-white pb-3 pt-2 flex-1 hover:bg-[var(--surface-800)]/50 transition-colors rounded-t-lg"
              >
                <p className="text-white text-sm font-bold leading-normal tracking-[0.015em]">회원가입</p>
              </Link>
            </div>
          </div>

          <form className="flex flex-col gap-5 px-6 py-6" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2">
              <span className="text-white text-base font-medium leading-normal">이메일</span>
              <div className="relative">
                <input
                  className="flex w-full resize-none overflow-hidden rounded-xl text-white focus:outline-0 focus:ring-2 focus:ring-[var(--primary)]/50 border border-[var(--border-dark)] bg-[var(--surface-800)] focus:border-[var(--primary)] h-14 placeholder:text-[var(--text-muted)]/50 p-[15px] pr-12 text-base font-normal leading-normal transition-colors"
                  placeholder="user@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none w-5 h-5" />
              </div>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-white text-base font-medium leading-normal">비밀번호</span>
              <div className="relative">
                <input
                  className="flex w-full resize-none overflow-hidden rounded-xl text-white focus:outline-0 focus:ring-2 focus:ring-[var(--primary)]/50 border border-[var(--border-dark)] bg-[var(--surface-800)] focus:border-[var(--primary)] h-14 placeholder:text-[var(--text-muted)]/50 p-[15px] pr-12 text-base font-normal leading-normal transition-colors"
                  placeholder="6자 이상 입력하세요"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white transition-colors flex items-center justify-center"
                >
                  {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-white text-base font-medium leading-normal">비밀번호 확인</span>
              <div className="relative">
                <input
                  className="flex w-full resize-none overflow-hidden rounded-xl text-white focus:outline-0 focus:ring-2 focus:ring-[var(--primary)]/50 border border-[var(--border-dark)] bg-[var(--surface-800)] focus:border-[var(--primary)] h-14 placeholder:text-[var(--text-muted)]/50 p-[15px] pr-12 text-base font-normal leading-normal transition-colors"
                  placeholder="비밀번호를 다시 입력하세요"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white transition-colors flex items-center justify-center"
                >
                  {showConfirmPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>
            </label>

            {error && (
              <p className="text-sm text-[var(--color-error)] text-center animate-fade-in">{error}</p>
            )}

            <div className="pt-2 flex flex-col gap-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-[var(--background-dark)] text-base font-bold leading-normal tracking-[0.015em] transition-all shadow-md hover:shadow-lg shadow-[var(--primary)]/10 active:scale-[0.99] disabled:opacity-50"
              >
                <span className="truncate">{isLoading ? "가입 중..." : "가입하기"}</span>
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-[var(--border-dark)]"></div>
                <span className="flex-shrink-0 mx-4 text-[var(--text-muted)] text-xs uppercase font-bold tracking-wider">또는 다음으로 계속</span>
                <div className="flex-grow border-t border-[var(--border-dark)]"></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSocialLogin("google")}
                  className="flex items-center justify-center gap-2 rounded-xl h-12 border border-[var(--border-dark)] bg-[var(--surface-800)] hover:bg-[var(--surface-700)] text-white transition-all font-medium text-sm"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.283 10.356h-8.327v3.451h4.792c-.446 2.193-2.313 3.453-4.792 3.453a5.27 5.27 0 0 1-5.279-5.28 5.27 5.27 0 0 1 5.279-5.279c1.259 0 2.397.447 3.29 1.178l2.6-2.599c-1.584-1.381-3.615-2.233-5.89-2.233a8.908 8.908 0 0 0-8.934 8.934 8.907 8.907 0 0 0 8.934 8.934c4.467 0 8.529-3.249 8.529-8.934 0-.528-.081-1.097-.202-1.625z"></path>
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialLogin("kakao")}
                  className="flex items-center justify-center gap-2 rounded-xl h-12 border border-[var(--border-dark)] bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] transition-all font-medium text-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3C6.477 3 2 6.463 2 10.742c0 2.748 1.826 5.165 4.586 6.546-.152.537-.978 3.453-.999 3.669 0 0-.02.166.088.23.108.063.235.013.235.013.31-.043 3.586-2.355 4.153-2.761.614.089 1.251.135 1.906.135 5.523 0 10-3.463 10-7.832C22 6.463 17.523 3 12 3z"/>
                  </svg>
                  카카오
                </button>
              </div>
            </div>
          </form>

          <div className="pb-6 text-center">
            <p className="text-[var(--text-muted)] text-sm">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="text-[var(--primary)] hover:underline font-bold">
                로그인
              </Link>
            </p>
          </div>
        </div>
      </main>

      <footer className="w-full py-6 border-t border-[var(--border-dark)] mt-auto bg-[var(--background-dark)]/50 z-10 relative">
        <div className="px-10 flex justify-center">
          <p className="text-[var(--text-muted)]/60 text-xs text-center">© 2024 Match Archive. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
