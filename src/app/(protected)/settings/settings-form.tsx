"use client";

import { useState, useRef, useMemo } from "react";
import { User, Mail, Phone, Zap, Edit, Trash2, LogOut, Upload, Hash, Copy, Check, Globe, Calendar, Footprints, Clock, Tag, Briefcase, X, Plus } from "lucide-react";
import { updateUserProfile, signOut } from "@/services/auth";
import { createClient } from "@/lib/supabase/client";
import imageCompression from "browser-image-compression";
import type { User as UserType } from "@/types/supabase";
import { countries, TCountryCode } from "countries-list";
import { AlertModal, type AlertType } from "@/components/ui/alert-modal";

// ISO 국가 코드를 국기 이모지로 변환
function countryCodeToEmoji(code: string): string {
  const codePoints = code
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

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
  const [copied, setCopied] = useState(false);
  const [nationality, setNationality] = useState(user.nationality || "KR");
  const [birthDate, setBirthDate] = useState(user.birth_date || "");
  const [preferredFoot, setPreferredFoot] = useState<"left" | "right" | "both" | "">(user.preferred_foot || "");
  const [preferredTimes, setPreferredTimes] = useState<string[]>(user.preferred_times || []);
  const [soccerExperience, setSoccerExperience] = useState(user.soccer_experience || "");
  const [playStyleTags, setPlayStyleTags] = useState<string[]>(user.play_style_tags || []);
  const [newTag, setNewTag] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    type: AlertType;
    title?: string;
    message: string;
    navigateBack?: boolean;
  }>({ type: "info", message: "" });

  const showModal = (type: AlertType, message: string, title?: string, navigateBack = false) => {
    setModalConfig({ type, title, message, navigateBack });
    setModalOpen(true);
  };

  // 선호 시간대 옵션
  const TIME_OPTIONS = [
    "평일 오전",
    "평일 오후",
    "평일 저녁",
    "주말 오전",
    "주말 오후",
    "주말 저녁",
  ];

  // 플레이 스타일 태그 추천
  const SUGGESTED_TAGS = [
    "빌드업형",
    "투쟁형",
    "테크니션",
    "스피드스타",
    "골게터",
    "플레이메이커",
    "수비전문가",
    "멀티플레이어",
    "체력왕",
    "패스마스터",
  ];

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
        nationality,
        birth_date: birthDate || null,
        preferred_foot: preferredFoot || null,
        preferred_times: preferredTimes.length > 0 ? preferredTimes : null,
        soccer_experience: soccerExperience || null,
        play_style_tags: playStyleTags.length > 0 ? playStyleTags : null,
      });

      showModal("success", "프로필이 성공적으로 업데이트되었습니다!", "완료", true);
    } catch (error) {
      console.error("Failed to update profile:", error);
      showModal("error", "프로필 업데이트에 실패했습니다.");
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
    showModal("info", "회원 탈퇴 기능은 준비 중입니다.", "알림");
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 형식 체크
    if (!file.type.startsWith("image/")) {
      showModal("error", "이미지 파일만 업로드 가능합니다.");
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

      showModal("success", "프로필 사진이 업데이트되었습니다!", "완료");
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      showModal("error", "프로필 사진 업로드에 실패했습니다.");
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
      showModal("success", "프로필 사진이 삭제되었습니다!", "완료");
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error("Failed to delete avatar:", error);
      showModal("error", "프로필 사진 삭제에 실패했습니다.");
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

  const handleCopyUserCode = async () => {
    if (!user.user_code) return;
    try {
      await navigator.clipboard.writeText(user.user_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
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

            {/* Player Code (Read-only) */}
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-white/80">플레이어 코드</span>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  value={user.user_code || "생성 중..."}
                  readOnly
                  disabled
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-12 pr-12 text-white/50 cursor-not-allowed outline-none font-mono tracking-wider"
                />
                {user.user_code && (
                  <button
                    type="button"
                    onClick={handleCopyUserCode}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    title="코드 복사"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-[#00e677]" />
                    ) : (
                      <Copy className="w-4 h-4 text-white/40 hover:text-white/70" />
                    )}
                  </button>
                )}
              </div>
              <span className="text-xs text-white/40">팀원 초대 시 이 코드를 공유하세요</span>
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

            {/* Nationality */}
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-white/80">국적</span>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <select
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-black/20 py-3.5 pl-12 pr-10 text-white focus:border-[#00e677] focus:bg-black/30 focus:ring-1 focus:ring-[#00e677] outline-none transition-all"
                >
                  {sortedCountries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.emoji} {country.name} ({country.englishName})
                    </option>
                  ))}
                </select>
              </div>
            </label>

            {/* Birth Date */}
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-white/80">생년월일</span>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-12 pr-4 text-white focus:border-[#00e677] focus:bg-black/30 focus:ring-1 focus:ring-[#00e677] outline-none transition-all [color-scheme:dark]"
                />
              </div>
            </label>

            {/* Preferred Foot */}
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-white/80">주발</span>
              <div className="relative">
                <Footprints className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <select
                  value={preferredFoot}
                  onChange={(e) => setPreferredFoot(e.target.value as "left" | "right" | "both" | "")}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-black/20 py-3.5 pl-12 pr-10 text-white focus:border-[#00e677] focus:bg-black/30 focus:ring-1 focus:ring-[#00e677] outline-none transition-all"
                >
                  <option value="">선택하세요</option>
                  <option value="right">오른발</option>
                  <option value="left">왼발</option>
                  <option value="both">양발</option>
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

          {/* Soccer Experience */}
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-white/80">축구 경력</span>
            <div className="relative">
              <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                value={soccerExperience}
                onChange={(e) => setSoccerExperience(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-12 pr-4 text-white placeholder-white/30 focus:border-[#00e677] focus:bg-black/30 focus:ring-1 focus:ring-[#00e677] outline-none transition-all"
                placeholder="예: 대학 축구부 3년, 동호회 활동 5년"
              />
            </div>
          </label>

          {/* Preferred Times */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              선호 시간대
            </span>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {TIME_OPTIONS.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => {
                    if (preferredTimes.includes(time)) {
                      setPreferredTimes(preferredTimes.filter((t) => t !== time));
                    } else {
                      setPreferredTimes([...preferredTimes, time]);
                    }
                  }}
                  className={`py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                    preferredTimes.includes(time)
                      ? "bg-[#00e677]/20 border-[#00e677] text-[#00e677] border"
                      : "bg-black/20 border border-white/10 text-white/70 hover:border-white/30"
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Play Style Tags */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              플레이 스타일 태그
            </span>

            {/* 현재 태그들 */}
            {playStyleTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {playStyleTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00e677]/20 text-[#00e677] text-sm font-medium border border-[#00e677]/30"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => setPlayStyleTags(playStyleTags.filter((_, i) => i !== idx))}
                      className="hover:bg-[#00e677]/30 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* 태그 추가 입력 */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTag.trim()) {
                      e.preventDefault();
                      if (!playStyleTags.includes(newTag.trim())) {
                        setPlayStyleTags([...playStyleTags, newTag.trim()]);
                      }
                      setNewTag("");
                    }
                  }}
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pl-4 pr-4 text-white placeholder-white/30 focus:border-[#00e677] focus:bg-black/30 focus:ring-1 focus:ring-[#00e677] outline-none transition-all text-sm"
                  placeholder="직접 입력 (Enter로 추가)"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (newTag.trim() && !playStyleTags.includes(newTag.trim())) {
                    setPlayStyleTags([...playStyleTags, newTag.trim()]);
                    setNewTag("");
                  }
                }}
                className="px-4 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* 추천 태그 */}
            <div className="flex flex-wrap gap-2 mt-2">
              {SUGGESTED_TAGS.filter((tag) => !playStyleTags.includes(tag)).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setPlayStyleTags([...playStyleTags, tag])}
                  className="py-1.5 px-3 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs hover:border-white/30 hover:text-white/70 transition-all"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

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

      {/* Alert Modal */}
      <AlertModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        navigateBack={modalConfig.navigateBack}
      />
    </>
  );
}
