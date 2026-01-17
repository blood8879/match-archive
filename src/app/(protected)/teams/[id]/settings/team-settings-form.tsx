"use client";

import { useState, useRef, useTransition } from "react";
import { Shield, MapPin, Upload, Edit, Trash2, Hash, X, Plus, UserPlus, FileText, Star } from "lucide-react";
import { updateTeam } from "@/services/teams";
import imageCompression from "browser-image-compression";
import type { Team } from "@/types/supabase";
import { useRouter } from "next/navigation";
import { AlertModal, type AlertType } from "@/components/ui/alert-modal";
import { Select, SelectItem } from "@/components/ui/select";

interface TeamSettingsFormProps {
  team: Team;
}

export function TeamSettingsForm({ team }: TeamSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploadingEmblem, setUploadingEmblem] = useState(false);
  const [name, setName] = useState(team.name || "");
  const [region, setRegion] = useState(team.region || "");
  const [emblemPreview, setEmblemPreview] = useState<string | null>(
    team.emblem_url
  );
  const [emblemFile, setEmblemFile] = useState<File | null>(null);
  const [hashtags, setHashtags] = useState<string[]>(team.hashtags || []);
  const [hashtagInput, setHashtagInput] = useState("");
  const [description, setDescription] = useState(team.description || "");
  const [activityDays, setActivityDays] = useState<string[]>(team.activity_days || []);
  const [isRecruiting, setIsRecruiting] = useState(team.is_recruiting || false);
  const [recruitingPositions, setRecruitingPositions] = useState<{
    FW: number;
    MF: number;
    DF: number;
    GK: number;
  }>({
    FW: team.recruiting_positions?.FW ?? 0,
    MF: team.recruiting_positions?.MF ?? 0,
    DF: team.recruiting_positions?.DF ?? 0,
    GK: team.recruiting_positions?.GK ?? 0,
  });
  const [level, setLevel] = useState(team.level || 1);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", name);
    formData.append("region", region);
    formData.append("hashtags", JSON.stringify(hashtags));
    formData.append("description", description);
    formData.append("activity_days", JSON.stringify(activityDays));
    formData.append("is_recruiting", isRecruiting.toString());
    formData.append("recruiting_positions", JSON.stringify(recruitingPositions));
    formData.append("level", level.toString());
    if (emblemFile) {
      formData.append("emblem", emblemFile);
    }

    startTransition(async () => {
      try {
        await updateTeam(team.id, formData);
        showModal("success", "팀 정보가 성공적으로 업데이트되었습니다!", "완료", true);
        router.refresh();
      } catch (error: any) {
        console.error("Failed to update team:", error);
        showModal("error", error.message || "팀 정보 업데이트에 실패했습니다.");
      }
    });
  };

  const handleEmblemClick = () => {
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

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showModal("error", "파일 크기는 5MB를 초과할 수 없습니다.");
      return;
    }

    setUploadingEmblem(true);

    try {
      // 이미지 압축 옵션
      const options = {
        maxSizeMB: 1, // 최대 1MB
        maxWidthOrHeight: 400, // 최대 400px
        useWebWorker: true,
      };

      // 이미지 압축
      const compressedFile = await imageCompression(file, options);

      // 미리보기 설정
      const reader = new FileReader();
      reader.onloadend = () => {
        setEmblemPreview(reader.result as string);
      };
      reader.readAsDataURL(compressedFile);

      setEmblemFile(compressedFile);
    } catch (error) {
      console.error("Failed to compress image:", error);
      showModal("error", "이미지 처리에 실패했습니다.");
      setEmblemPreview(team.emblem_url);
    } finally {
      setUploadingEmblem(false);
    }
  };

  const handleDeleteEmblem = () => {
    setEmblemPreview(null);
    setEmblemFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAddHashtag = () => {
    const cleaned = hashtagInput.trim().replace(/^#/, "");
    if (!cleaned) return;

    if (hashtags.length >= 5) {
      showModal("warning", "해시태그는 최대 5개까지 입력 가능합니다.");
      return;
    }

    const newTag = `#${cleaned}`;
    if (hashtags.includes(newTag)) {
      showModal("warning", "이미 추가된 해시태그입니다.");
      return;
    }

    setHashtags([...hashtags, newTag]);
    setHashtagInput("");
  };

  const handleRemoveHashtag = (index: number) => {
    setHashtags(hashtags.filter((_, i) => i !== index));
  };

  const handleHashtagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddHashtag();
    }
  };

  const handlePositionChange = (position: "FW" | "MF" | "DF" | "GK", value: number) => {
    setRecruitingPositions((prev) => ({
      ...prev,
      [position]: Math.max(0, Math.min(10, value)),
    }));
  };

  return (
    <>
      <div className="glass-panel rounded-2xl p-6 lg:p-10 shadow-xl bg-[#214a36]/40 backdrop-blur-xl border border-[#8eccae]/15">
        {/* Team Header */}
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-white/10 pb-8">
          <div className="flex items-center gap-6">
            <div
              className="relative group cursor-pointer"
              onClick={handleEmblemClick}
            >
              <div className="size-24 rounded-full bg-gradient-to-br from-[#214a36] to-[#0f2319] p-1 shadow-2xl ring-4 ring-[#00e677]/20 overflow-hidden">
                {emblemPreview ? (
                  <img
                    src={emblemPreview}
                    alt={team.name || "Team Emblem"}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#1a4031] flex items-center justify-center">
                    <Shield className="w-12 h-12 text-[#00e677]" />
                  </div>
                )}
              </div>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingEmblem ? (
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
              <h3 className="text-2xl font-bold text-white">
                {team.name || "팀"}
              </h3>
              <p className="text-[#00e677] font-medium">
                {region || "지역 미지정"}
              </p>
              <p className="text-sm text-white/50">
                생성일: {new Date(team.created_at).toLocaleDateString("ko-KR")}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleEmblemClick}
              disabled={uploadingEmblem}
              className="flex items-center justify-center rounded-xl bg-white/10 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingEmblem ? "처리 중..." : "엠블럼 변경"}
            </button>
            <button
              type="button"
              onClick={handleDeleteEmblem}
              disabled={uploadingEmblem || !emblemPreview}
              className="flex items-center justify-center rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold text-white/70 hover:text-white hover:border-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              삭제
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Team Name */}
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-white/80">
                팀 이름
              </span>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-12 pr-4 text-white placeholder-white/30 focus:border-[#00e677] focus:bg-black/30 focus:ring-1 focus:ring-[#00e677] outline-none transition-all"
                  placeholder="팀 이름을 입력하세요"
                  required
                />
              </div>
            </label>

            {/* Region */}
            <Select
              label="지역"
              value={region}
              onValueChange={setRegion}
              placeholder="선택하세요"
              icon={<MapPin className="w-5 h-5" />}
              className="rounded-xl border-white/10 bg-black/20 text-white hover:bg-black/30"
            >
              <SelectItem value="서울">서울</SelectItem>
              <SelectItem value="경기">경기</SelectItem>
              <SelectItem value="인천">인천</SelectItem>
              <SelectItem value="부산">부산</SelectItem>
              <SelectItem value="대구">대구</SelectItem>
              <SelectItem value="광주">광주</SelectItem>
              <SelectItem value="대전">대전</SelectItem>
              <SelectItem value="울산">울산</SelectItem>
              <SelectItem value="세종">세종</SelectItem>
              <SelectItem value="강원">강원</SelectItem>
              <SelectItem value="충북">충북</SelectItem>
              <SelectItem value="충남">충남</SelectItem>
              <SelectItem value="전북">전북</SelectItem>
              <SelectItem value="전남">전남</SelectItem>
              <SelectItem value="경북">경북</SelectItem>
              <SelectItem value="경남">경남</SelectItem>
              <SelectItem value="제주">제주</SelectItem>
            </Select>

            {/* Team Level */}
            <div className="space-y-2">
              <Select
                label="팀 레벨"
                value={level.toString()}
                onValueChange={(val) => setLevel(parseInt(val, 10))}
                icon={<Star className="w-5 h-5" />}
                className="rounded-xl border-white/10 bg-black/20 text-white hover:bg-black/30"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lv) => (
                  <SelectItem key={lv} value={lv.toString()}>
                    LV. {lv} {lv <= 3 ? "(입문)" : lv <= 5 ? "(초급)" : lv <= 7 ? "(중급)" : lv <= 9 ? "(상급)" : "(프로)"}
                  </SelectItem>
                ))}
              </Select>
              <p className="text-xs text-white/50">
                팀의 실력 수준을 선택하세요
              </p>
            </div>
          </div>

          {/* Hashtags */}
          <div className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-semibold text-white/80">
              해시태그 (최대 5개)
            </span>
            <div className="flex flex-wrap gap-2 mb-2">
              {hashtags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#214a36] text-[#8eccae] text-sm font-medium"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveHashtag(index)}
                    className="p-0.5 hover:bg-white/10 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
            {hashtags.length < 5 && (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="text"
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={handleHashtagKeyDown}
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-12 pr-4 text-white placeholder-white/30 focus:border-[#00e677] focus:bg-black/30 focus:ring-1 focus:ring-[#00e677] outline-none transition-all"
                    placeholder="해시태그 입력 (예: 매너팀)"
                    maxLength={20}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddHashtag}
                  disabled={!hashtagInput.trim()}
                  className="flex items-center justify-center rounded-xl bg-[#214a36] px-4 py-2 text-white hover:bg-[#2b5d45] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            )}
            <p className="text-xs text-white/50">
              팀을 설명하는 해시태그를 입력하세요. (예: #매너팀, #주말오전, #2030)
            </p>
          </div>

          {/* Team Description */}
          <div className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-semibold text-white/80">
              팀 소개
            </span>
            <div className="relative">
              <FileText className="absolute left-4 top-4 w-5 h-5 text-white/40" />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-12 pr-4 text-white placeholder-white/30 focus:border-[#00e677] focus:bg-black/30 focus:ring-1 focus:ring-[#00e677] outline-none transition-all min-h-[120px] resize-none"
                placeholder="팀을 소개하는 글을 작성하세요"
                maxLength={500}
              />
            </div>
            <p className="text-xs text-white/50 text-right">
              {description.length}/500
            </p>
          </div>

          {/* Activity Days */}
          <div className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-semibold text-white/80">
              주 활동 요일
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "월", label: "월" },
                { value: "화", label: "화" },
                { value: "수", label: "수" },
                { value: "목", label: "목" },
                { value: "금", label: "금" },
                { value: "토", label: "토" },
                { value: "일", label: "일" },
              ].map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => {
                    if (activityDays.includes(day.value)) {
                      setActivityDays(activityDays.filter((d) => d !== day.value));
                    } else {
                      setActivityDays([...activityDays, day.value]);
                    }
                  }}
                  className={`w-12 h-12 rounded-xl font-bold text-sm transition-all ${
                    activityDays.includes(day.value)
                      ? "bg-[#00e677] text-[#0f2319] shadow-lg shadow-[#00e677]/20"
                      : "bg-black/20 text-white/70 border border-white/10 hover:border-[#00e677]/50 hover:text-white"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-white/50">
              주로 활동하는 요일을 선택하세요 (복수 선택 가능)
            </p>
          </div>

          {/* Recruiting Status */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-white/80">
              모집 상태
            </span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecruiting}
                  onChange={(e) => setIsRecruiting(e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-black/20 text-[#00e677] focus:ring-[#00e677] focus:ring-offset-0"
                />
                <span className="text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  팀원 모집중
                </span>
              </label>
            </div>
          </div>

          {/* Recruiting Positions */}
          {isRecruiting && (
            <div className="flex flex-col gap-3 md:col-span-2 p-4 rounded-xl bg-black/20 border border-white/10">
              <span className="text-sm font-semibold text-white/80">
                포지션별 모집 인원
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {(["FW", "MF", "DF", "GK"] as const).map((pos) => (
                  <div key={pos} className="flex flex-col gap-2">
                    <span className="text-xs text-[#8eccae] font-medium">
                      {pos === "FW" ? "공격수" : pos === "MF" ? "미드필더" : pos === "DF" ? "수비수" : "골키퍼"}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePositionChange(pos, recruitingPositions[pos] - 1)}
                        className="w-8 h-8 rounded-lg bg-[#214a36] text-white hover:bg-[#2b5d45] transition-colors flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-white font-bold">
                        {recruitingPositions[pos]}
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePositionChange(pos, recruitingPositions[pos] + 1)}
                        className="w-8 h-8 rounded-lg bg-[#214a36] text-white hover:bg-[#2b5d45] transition-colors flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/50">
                각 포지션별 모집 인원을 설정하세요. (0은 모집 안함)
              </p>
            </div>
          )}

          {/* Invite Code (Read-only) */}
          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-semibold text-white/80">
              초대 코드
            </span>
            <div className="relative">
              <input
                type="text"
                value={team.code || "N/A"}
                readOnly
                disabled
                className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 px-4 text-white/50 cursor-not-allowed outline-none"
              />
            </div>
            <p className="text-xs text-white/50">
              이 코드를 사용하여 다른 사용자를 팀에 초대할 수 있습니다.
            </p>
          </label>

          {/* Action Buttons */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl px-6 py-3.5 text-sm font-bold text-white hover:bg-white/5 transition-all"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending || uploadingEmblem}
              className="rounded-xl bg-[#00e677] px-8 py-3.5 text-sm font-bold text-[#0f2319] shadow-lg shadow-[#00e677]/20 hover:bg-green-400 hover:shadow-[#00e677]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "저장 중..." : "변경사항 저장"}
            </button>
          </div>
        </form>
      </div>

      {/* Destructive Area */}
      <div className="mt-10 rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
        <h3 className="text-lg font-bold text-red-400 mb-2">위험 구역</h3>
        <p className="text-sm text-white/60 mb-6">
          팀을 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => showModal("info", "팀 삭제 기능은 준비 중입니다.", "알림")}
            className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            팀 삭제
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
