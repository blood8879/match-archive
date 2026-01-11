"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const POSITIONS = [
  { value: "FW", label: "FW (공격수)" },
  { value: "MF", label: "MF (미드필더)" },
  { value: "DF", label: "DF (수비수)" },
  { value: "GK", label: "GK (골키퍼)" },
] as const;

const REGIONS = [
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "대전",
  "광주",
  "울산",
  "세종",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
];

type Position = (typeof POSITIONS)[number]["value"];

export default function OnboardingPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [position, setPosition] = useState<Position | "">("");
  const [region, setRegion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nickname.trim()) {
      setError("닉네임을 입력해주세요.");
      return;
    }

    setIsLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("로그인이 필요합니다.");
      router.push("/login");
      return;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        nickname: nickname.trim(),
        position: (position || null) as "FW" | "MF" | "DF" | "GK" | null,
      })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card variant="glass" className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">프로필 설정</CardTitle>
          <p className="mt-2 text-center text-text-400">
            축구 라이프를 시작해볼까요?
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="닉네임"
              placeholder="팀원들에게 보여질 이름"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-text-400">
                주 포지션
              </label>
              <div className="grid grid-cols-2 gap-2">
                {POSITIONS.map((pos) => (
                  <button
                    key={pos.value}
                    type="button"
                    onClick={() => setPosition(pos.value)}
                    className={`rounded-lg border px-4 py-3 text-sm transition-all ${
                      position === pos.value
                        ? "border-primary-500 bg-primary-500/10 text-primary-500"
                        : "border-white/10 bg-surface-700 text-text-400 hover:border-white/20"
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-text-400">
                활동 지역
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-lg bg-surface-700 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">선택하세요 (선택)</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" isLoading={isLoading}>
              시작하기
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
