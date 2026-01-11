"use client";

import { useState, useRef } from "react";
import { User, Mail, Phone, Zap, Edit, Trash2, LogOut, Upload } from "lucide-react";
import { updateUserProfile, signOut } from "@/services/auth";
import { createClient } from "@/lib/supabase/client";
import imageCompression from "browser-image-compression";
import type { User as UserType } from "@/types/supabase";

interface SettingsFormProps {
  user: UserType;
}

export function SettingsForm({ user }: SettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [nickname, setNickname] = useState(user.nickname || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [preferredPosition, setPreferredPosition] = useState(user.preferred_position || "");
  const [bio, setBio] = useState(user.bio || "");
  const [isPublic, setIsPublic] = useState(user.is_public ?? true);
  const [emailNotifications, setEmailNotifications] = useState(user.email_notifications ?? false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar_url);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateUserProfile({
        nickname,
        phone,
        preferred_position: preferredPosition,
        bio,
        is_public: isPublic,
        email_notifications: emailNotifications,
      });

      alert("프로필이 성공적으로 업데이트되었습니다!");
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert("프로필 업데이트에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (confirm("로그아웃하시겠습니까?")) {
      await signOut();
    }
  };

  const handleDeleteAccount = () => {
    alert("회원 탈퇴 기능은 준비 중입니다.");
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 형식 체크
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드 가능합니다.");
      return;
    }

    setUploadingAvatar(true);

    try {
      // 이미지 압축 옵션
      const options = {
        maxSizeMB: 0.5, // 최대 500KB
        maxWidthOrHeight: 800, // 최대 800px
        useWebWorker: true,
        fileType: "image/jpeg", // JPEG로 변환
      };

      // 이미지 압축
      const compressedFile = await imageCompression(file, options);

      // 미리보기 설정
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);

      // Supabase 클라이언트로 직접 업로드
      const supabase = createClient();
      const fileExt = "jpg"; // JPEG로 통일
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // 기존 아바타 삭제 (있다면)
      if (user.avatar_url) {
        const url = new URL(user.avatar_url);
        const pathParts = url.pathname.split("/");
        const bucketIndex = pathParts.indexOf("avatars");
        if (bucketIndex !== -1) {
          const filePath = pathParts.slice(bucketIndex + 1).join("/");
          await supabase.storage.from("avatars").remove([filePath]);
        }
      }

      // 새 아바타 업로드
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, compressedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // 공개 URL 가져오기
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(fileName);

      // users 테이블 업데이트
      const { error: updateError } = await supabase
        .from("users")
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      alert("프로필 사진이 업데이트되었습니다!");
      window.location.reload();
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      alert("프로필 사진 업로드에 실패했습니다.");
      setAvatarPreview(user.avatar_url);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!confirm("프로필 사진을 삭제하시겠습니까?")) return;

    setUploadingAvatar(true);

    try {
      const supabase = createClient();

      // 기존 아바타 삭제
      if (user.avatar_url) {
        const url = new URL(user.avatar_url);
        const pathParts = url.pathname.split("/");
        const bucketIndex = pathParts.indexOf("avatars");
        if (bucketIndex !== -1) {
          const filePath = pathParts.slice(bucketIndex + 1).join("/");
          await supabase.storage.from("avatars").remove([filePath]);
        }
      }

      // users 테이블 업데이트
      const { error: updateError } = await supabase
        .from("users")
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      setAvatarPreview(null);
      alert("프로필 사진이 삭제되었습니다!");
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete avatar:", error);
      alert("프로필 사진 삭제에 실패했습니다.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getPositionLabel = (pos: string) => {
    const positions: Record<string, string> = {
      FW: "공격수",
      MF: "미드필더",
      DF: "수비수",
      GK: "골키퍼",
    };
    return positions[pos] || "미지정";
  };

  return (
    <>
      <div className="glass-panel rounded-2xl p-6 lg:p-10 shadow-xl bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15">
        {/* Profile Header */}
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-white/10 pb-8">
          <div className="flex items-center gap-6">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              <div className="size-24 rounded-full bg-gradient-to-br from-[#214a36] to-[#0f2319] p-1 shadow-2xl ring-4 ring-[#00e677]/20 overflow-hidden">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={user.nickname || "User"}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#1a4031] flex items-center justify-center">
                    <User className="w-12 h-12 text-[#00e677]" />
                  </div>
                )}
              </div>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingAvatar ? (
                  <Upload className="w-6 h-6 text-white animate-bounce" />
                ) : (
                  <Edit className="w-6 h-6 text-white" />
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col">
              <h3 className="text-2xl font-bold text-white">{user.nickname || "사용자"}</h3>
              <p className="text-[#00e677] font-medium">
                {preferredPosition ? getPositionLabel(preferredPosition) : "포지션 미지정"}
              </p>
              <p className="text-sm text-white/50">
                가입일: {new Date(user.created_at).toLocaleDateString("ko-KR")}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={uploadingAvatar}
              className="flex items-center justify-center rounded-xl bg-white/10 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingAvatar ? "업로드 중..." : "사진 변경"}
            </button>
            <button
              type="button"
              onClick={handleDeleteAvatar}
              disabled={uploadingAvatar || !avatarPreview}
              className="flex items-center justify-center rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold text-white/70 hover:text-white hover:border-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              삭제
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Nickname */}
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-white/80">닉네임</span>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-12 pr-4 text-white placeholder-white/30 focus:border-[#00e677] focus:bg-black/30 focus:ring-1 focus:ring-[#00e677] outline-none transition-all"
                  placeholder="닉네임을 입력하세요"
                  required
                />
              </div>
            </label>

            {/* Email (Read-only) */}
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-white/80">이메일</span>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="email"
                  value={user.email}
                  readOnly
                  disabled
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-12 pr-4 text-white/50 cursor-not-allowed outline-none"
                />
              </div>
            </label>

            {/* Phone */}
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-white/80">전화번호</span>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-12 pr-4 text-white placeholder-white/30 focus:border-[#00e677] focus:bg-black/30 focus:ring-1 focus:ring-[#00e677] outline-none transition-all"
                  placeholder="010-0000-0000"
                />
              </div>
            </label>

            {/* Position */}
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-white/80">주 포지션</span>
              <div className="relative">
                <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <select
                  value={preferredPosition}
                  onChange={(e) => setPreferredPosition(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-black/20 py-3.5 pl-12 pr-10 text-white focus:border-[#00e677] focus:bg-black/30 focus:ring-1 focus:ring-[#00e677] outline-none transition-all"
                >
                  <option value="">선택하세요</option>
                  <option value="FW">공격수 (FW)</option>
                  <option value="MF">미드필더 (MF)</option>
                  <option value="DF">수비수 (DF)</option>
                  <option value="GK">골키퍼 (GK)</option>
                </select>
              </div>
            </label>
          </div>

          {/* Bio */}
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-white/80">자기소개</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-xl border border-white/10 bg-black/20 p-4 text-white placeholder-white/30 focus:border-[#00e677] focus:bg-black/30 focus:ring-1 focus:ring-[#00e677] outline-none transition-all"
              placeholder="자신의 플레이 스타일이나 소개를 입력해주세요."
            />
          </label>

          <div className="h-px bg-white/10 my-2"></div>

          {/* Toggles */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">프로필 공개</p>
                <p className="text-xs text-white/50">다른 사용자가 내 기록을 볼 수 있습니다.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00e677]"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">이메일 수신 동의</p>
                <p className="text-xs text-white/50">매칭 알림 및 뉴스레터를 이메일로 받습니다.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00e677]"></div>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="rounded-xl px-6 py-3.5 text-sm font-bold text-white hover:bg-white/5 transition-all"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#00e677] px-8 py-3.5 text-sm font-bold text-[#0f2319] shadow-lg shadow-[#00e677]/20 hover:bg-green-400 hover:shadow-[#00e677]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "저장 중..." : "변경사항 저장"}
            </button>
          </div>
        </form>
      </div>

      {/* Destructive Area */}
      <div className="mt-10 rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
        <h3 className="text-lg font-bold text-red-400 mb-2">계정 관리</h3>
        <p className="text-sm text-white/60 mb-6">
          계정을 로그아웃하거나 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex gap-4">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
          <button
            onClick={handleDeleteAccount}
            className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            회원 탈퇴
          </button>
        </div>
      </div>
    </>
  );
}
