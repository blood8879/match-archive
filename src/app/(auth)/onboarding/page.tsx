"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertCircle, Globe, Calendar, Footprints } from "lucide-react";
import { area } from "@/constants/area";
import { countries, TCountryCode } from "countries-list";

// ISO 국가 코드를 국기 이모지로 변환
function countryCodeToEmoji(code: string): string {
  const codePoints = code
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

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
  const [nationality, setNationality] = useState("KR");
  const [birthDate, setBirthDate] = useState("");
  const [preferredFoot, setPreferredFoot] = useState<"left" | "right" | "both" | "">("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [nicknameError, setNicknameError] = useState<string | null>(null);

  // 선택된 시/도의 구/군 목록
  const districts = area.find((a) => a.name === selectedCity)?.subArea || [];

  // 기존 유저 프로필 불러오기
  useEffect(() => {
    const loadExistingProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("nickname, position, nationality, birth_date, preferred_foot")
          .eq("id", user.id)
          .single();

        if (profile) {
          if (profile.nickname) setNickname(profile.nickname);
          if (profile.position) setPosition(profile.position as Position);
          if (profile.nationality) setNationality(profile.nationality);
          if (profile.birth_date) setBirthDate(profile.birth_date);
          if (profile.preferred_foot) setPreferredFoot(profile.preferred_foot as "left" | "right" | "both");
        }
      }
      setIsLoadingProfile(false);
    };

    loadExistingProfile();
  }, []);

  // 국가 목록 정렬 (한국어 이름 기준, 대한민국을 맨 위로)
  const sortedCountries = useMemo(() => {
    const countryList = Object.entries(countries).map(([code, data]) => ({
      code: code as TCountryCode,
      name: data.native,
      englishName: data.name,
      emoji: countryCodeToEmoji(code),
    }));

    // 한국을 맨 위로
    return countryList.sort((a, b) => {
      if (a.code === "KR") return -1;
      if (b.code === "KR") return 1;
      return a.name.localeCompare(b.name, "ko");
    });
  }, []);

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

    if (!nationality) {
      setError("국적을 선택해주세요.");
      return;
    }

    if (!birthDate) {
      setError("생년월일을 입력해주세요.");
      return;
    }

    if (!preferredFoot) {
      setError("주발을 선택해주세요.");
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
        nationality: nationality || null,
        birth_date: birthDate || null,
        preferred_foot: (preferredFoot || null) as "left" | "right" | "both" | null,
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

  const isFormValid =
    nickname.trim().length >= 2 &&
    nickname.length <= 20 &&
    nationality &&
    birthDate &&
    preferredFoot;

  if (isLoadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card variant="glass" className="w-full max-w-md">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
              <p className="text-text-400">프로필 정보를 불러오는 중...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <span className="font-semibold">닉네임, 국적, 생년월일, 주발</span>은 필수 입력 항목입니다.
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
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={selectedCity}
                  onValueChange={(value) => {
                    setSelectedCity(value);
                    setSelectedDistrict("");
                  }}
                  placeholder="시/도 선택"
                  fullWidth
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
                  fullWidth
                >
                  {districts.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>

            {/* 국적 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-text-400">
                국적 *
              </label>
              <Select
                value={nationality}
                onValueChange={setNationality}
                icon={<Globe className="w-5 h-5" />}
                fullWidth
              >
                {sortedCountries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.emoji} {country.name} ({country.englishName})
                  </SelectItem>
                ))}
              </Select>
            </div>

            {/* 생년월일 & 주발 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-text-400">
                  생년월일 *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none z-10" />
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-xl border border-white/10 bg-surface-700 py-3 pl-12 pr-4 text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all [color-scheme:dark]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-text-400">
                  주발 *
                </label>
                <Select
                  value={preferredFoot}
                  onValueChange={(val) => setPreferredFoot(val as "left" | "right" | "both" | "")}
                  icon={<Footprints className="w-5 h-5" />}
                  placeholder="선택 *"
                  fullWidth
                >
                  <SelectItem value="right">오른발</SelectItem>
                  <SelectItem value="left">왼발</SelectItem>
                  <SelectItem value="both">양발</SelectItem>
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
