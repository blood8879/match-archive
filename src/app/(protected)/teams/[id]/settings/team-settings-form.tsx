"use client";

import { useState, useRef, useTransition } from "react";
import { Shield, MapPin, Upload, Edit, Trash2 } from "lucide-react";
import { updateTeam } from "@/services/teams";
import imageCompression from "browser-image-compression";
import type { Team } from "@/types/supabase";
import { useRouter } from "next/navigation";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", name);
    formData.append("region", region);
    if (emblemFile) {
      formData.append("emblem", emblemFile);
    }

    startTransition(async () => {
      try {
        await updateTeam(team.id, formData);
        alert("팀 정보가 성공적으로 업데이트되었습니다!");
        router.refresh();
      } catch (error: any) {
        console.error("Failed to update team:", error);
        alert(error.message || "팀 정보 업데이트에 실패했습니다.");
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
      alert("이미지 파일만 업로드 가능합니다.");
      return;
    }

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("파일 크기는 5MB를 초과할 수 없습니다.");
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
      alert("이미지 처리에 실패했습니다.");
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
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-white/80">지역</span>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-black/20 py-3.5 pl-12 pr-10 text-white focus:border-[#00e677] focus:bg-black/30 focus:ring-1 focus:ring-[#00e677] outline-none transition-all"
                >
                  <option value="">선택하세요</option>
                  <option value="서울">서울</option>
                  <option value="경기">경기</option>
                  <option value="인천">인천</option>
                  <option value="부산">부산</option>
                  <option value="대구">대구</option>
                  <option value="광주">광주</option>
                  <option value="대전">대전</option>
                  <option value="울산">울산</option>
                  <option value="세종">세종</option>
                  <option value="강원">강원</option>
                  <option value="충북">충북</option>
                  <option value="충남">충남</option>
                  <option value="전북">전북</option>
                  <option value="전남">전남</option>
                  <option value="경북">경북</option>
                  <option value="경남">경남</option>
                  <option value="제주">제주</option>
                </select>
              </div>
            </label>
          </div>

          {/* Invite Code (Read-only) */}
          <label className="flex flex-col gap-2">
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
            onClick={() => alert("팀 삭제 기능은 준비 중입니다.")}
            className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            팀 삭제
          </button>
        </div>
      </div>
    </>
  );
}
