"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { User } from "@/types/supabase";

const POSITIONS = [
  { value: "FW", label: "FW (공격수)" },
  { value: "MF", label: "MF (미드필더)" },
  { value: "DF", label: "DF (수비수)" },
  { value: "GK", label: "GK (골키퍼)" },
] as const;

interface ProfileFormProps {
  profile: User | null;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [position, setPosition] = useState(profile?.position || "");
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 파일 크기 검증 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("파일 크기는 5MB를 초과할 수 없습니다");
        e.target.value = "";
        return;
      }

      // 파일 타입 검증
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setError("지원되지 않는 이미지 형식입니다 (JPG, PNG, WebP만 가능)");
        e.target.value = "";
        return;
      }

      setAvatarFile(file);

      // 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nickname.trim()) {
      setError("닉네임을 입력해주세요");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      let avatarUrl = profile?.avatar_url;

      // 아바타 파일이 있으면 업로드
      if (avatarFile) {
        try {
          // 파일명 생성
          const fileExt = avatarFile.name.split(".").pop();
          const timestamp = Date.now();
          const randomStr = Math.random().toString(36).substring(2, 15);
          const fileName = `${timestamp}_${randomStr}.${fileExt}`;
          const path = `${user.id}/${fileName}`;

          // 파일 업로드
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("user-avatars")
            .upload(path, avatarFile, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            setError(`이미지 업로드 실패: ${uploadError.message}`);
            return;
          }

          // Public URL 생성
          const {
            data: { publicUrl },
          } = supabase.storage.from("user-avatars").getPublicUrl(uploadData.path);

          avatarUrl = publicUrl;

          // 기존 아바타가 있으면 삭제
          if (profile?.avatar_url) {
            try {
              const urlParts = new URL(profile.avatar_url);
              const pathParts = urlParts.pathname.split("/");
              const bucketIndex = pathParts.findIndex((p) => p === "storage");
              if (bucketIndex !== -1) {
                const oldPath = pathParts.slice(bucketIndex + 3).join("/");
                await supabase.storage.from("user-avatars").remove([oldPath]);
              }
            } catch (error) {
              console.error("기존 아바타 삭제 중 오류:", error);
            }
          }
        } catch (error) {
          setError(error instanceof Error ? error.message : "이미지 업로드 중 오류가 발생했습니다");
          return;
        }
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({
          nickname: nickname.trim(),
          position: (position || null) as "FW" | "MF" | "DF" | "GK" | null,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      router.refresh();
    });
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col items-center gap-4 pb-4 border-b border-white/10">
        <div className="relative group cursor-pointer">
          <div className="w-24 h-24 rounded-full bg-surface-700 border-2 border-dashed border-white/20 group-hover:border-primary-500 flex items-center justify-center overflow-hidden transition-all">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-10 h-10 text-text-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-primary-500 text-white rounded-full p-1.5 shadow-lg pointer-events-none">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
        </div>
        <p className="text-sm text-text-400 text-center">
          프로필 사진을 업로드하세요<br />
          <span className="text-xs">(JPG, PNG, WebP, 최대 5MB)</span>
        </p>
      </div>

      <Input
        label="이메일"
        value={profile?.email || ""}
        disabled
        className="opacity-50"
      />

      <Input
        label="닉네임"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="팀원들에게 보여질 이름"
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" isLoading={isPending}>
        저장
      </Button>

      <hr className="border-white/10" />

      <Button
        type="button"
        variant="destructive"
        className="w-full"
        onClick={handleLogout}
      >
        로그아웃
      </Button>
    </form>
  );
}
