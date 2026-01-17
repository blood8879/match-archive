"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { area } from "@/constants/area";

const POSITIONS = [
  { value: "FW", label: "FW (공격수)" },
  { value: "MF", label: "MF (미드필더)" },
  { value: "DF", label: "DF (수비수)" },
  { value: "GK", label: "GK (골키퍼)" },
] as const;

type Position = (typeof POSITIONS)[number]["value"];

export default function OnboardingPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [position, setPosition] = useState<Position | "">("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);

  // 선택된 시/도의 구/군 목록
  const districts = area.find((a) => a.name === selectedCity)?.subArea || [];

  // 닉네임 유효성 검사
  useEffect(() => {
    if (nickname.trim().length > 0 && nickname.trim().length < 2) {
      setNicknameError("닉네임은 2자 이상이어야 합니다.");
    } else if (nickname.length > 20) {
      setNicknameError("닉네임은 20자 이하여야 합니다.");
    } else {
      setNicknameError(null);
    }
  }, [nickname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedNickname = nickname.trim();

    if (!trimmedNickname) {
      setError("닉네임을 입력해주세요.");
      return;
    }

    if (trimmedNickname.length < 2) {
      setError("닉네임은 2자 이상이어야 합니다.");
      return;
    }

    if (trimmedNickname.length > 20) {
      setError("닉네임은 20자 이하여야 합니다.");
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
        nickname: trimmedNickname,
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

  const isFormValid = nickname.trim().length >= 2 && nickname.length <= 20;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card variant="glass" className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">프로필 설정</CardTitle>
          <p className="mt-2 text-center text-text-400">
            서비스를 이용하기 전에 프로필을 설정해주세요.
          </p>
        </CardHeader>
        <CardContent>
          {/* 필수 안내 */}
          <div className="mb-6 flex items-start gap-2 rounded-lg bg-primary-500/10 p-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
            <p className="text-primary-400">
              <span className="font-semibold">닉네임</span>은 필수 입력 항목입니다.
              프로필 설정을 완료해야 서비스를 이용할 수 있습니다.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="닉네임 *"
                placeholder="팀원들에게 보여질 이름 (2~20자)"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                maxLength={20}
              />
              {nicknameError && (
                <p className="mt-1 text-xs text-destructive">{nicknameError}</p>
              )}
              <p className="mt-1 text-xs text-text-muted">
                {nickname.length}/20자
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-text-400">
                주 포지션 (선택)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {POSITIONS.map((pos) => (
                  <button
                    key={pos.value}
                    type="button"
                    onClick={() => setPosition(position === pos.value ? "" : pos.value)}
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
                활동 지역 (선택)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={selectedCity}
                  onValueChange={(value) => {
                    setSelectedCity(value);
                    setSelectedDistrict("");
                  }}
                  placeholder="시/도 선택"
                >
                  {area.map((a) => (
                    <SelectItem key={a.name} value={a.name}>
                      {a.name}
                    </SelectItem>
                  ))}
                </Select>
                <Select
                  value={selectedDistrict}
                  onValueChange={setSelectedDistrict}
                  placeholder="구/군 선택"
                  disabled={!selectedCity}
                >
                  {districts.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              disabled={!isFormValid || isLoading}
            >
              프로필 설정 완료
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
