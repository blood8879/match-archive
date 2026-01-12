"use client";

import { useState, useEffect } from "react";
import { X, Hash, MapPin, Check } from "lucide-react";
import { updateMemberInfo } from "@/services/teams";
import type { TeamMemberWithUser } from "@/services/teams";
import { useRouter } from "next/navigation";

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMemberWithUser | null;
}

type Position = "FW" | "MF" | "DF" | "GK";

const POSITIONS: { value: Position; label: string; fullLabel: string }[] = [
  { value: "FW", label: "FW", fullLabel: "공격수" },
  { value: "MF", label: "MF", fullLabel: "미드필더" },
  { value: "DF", label: "DF", fullLabel: "수비수" },
  { value: "GK", label: "GK", fullLabel: "골키퍼" },
];

export function EditMemberModal({
  isOpen,
  onClose,
  member,
}: EditMemberModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPositions, setSelectedPositions] = useState<Position[]>([]);
  const [backNumber, setBackNumber] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      // team_positions 배열에서 초기화
      const positions = (member.team_positions || []).filter(
        (p): p is Position => ["FW", "MF", "DF", "GK"].includes(p)
      );
      setSelectedPositions(positions);
      setBackNumber(member.back_number?.toString() ?? "");
      setError(null);
    }
  }, [member]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const togglePosition = (pos: Position) => {
    setSelectedPositions((prev) =>
      prev.includes(pos)
        ? prev.filter((p) => p !== pos)
        : [...prev, pos]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    const parsedBackNumber = backNumber ? parseInt(backNumber, 10) : null;

    if (parsedBackNumber !== null && (parsedBackNumber < 1 || parsedBackNumber > 99)) {
      setError("등번호는 1~99 사이의 숫자여야 합니다");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await updateMemberInfo(member.id, {
        team_positions: selectedPositions,
        back_number: parsedBackNumber,
      });
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !member) return null;

  const displayName =
    member.is_guest && member.guest_name
      ? member.guest_name
      : member.user?.nickname || "알 수 없음";

  const userPreferredPosition = member.user?.position;
  const avatarUrl = member.user?.avatar_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md mx-4 bg-surface-800 rounded-xl border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">선수 정보 수정</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-700 text-text-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* 선수 미리보기 카드 */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-surface-700">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-14 h-14 rounded-full object-cover border-2 border-surface-600"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-800 text-xl font-bold text-primary border-2 border-surface-600">
                {displayName.charAt(0)}
              </div>
            )}
            <div className="flex items-center gap-3">
              {backNumber && (
                <span className="text-3xl font-black text-primary tabular-nums">
                  {backNumber}
                </span>
              )}
              <div>
                <p className="font-bold text-white text-lg">{displayName}</p>
                <p className="text-sm text-primary font-medium">
                  {selectedPositions.length > 0
                    ? selectedPositions.join(" / ")
                    : userPreferredPosition || "포지션 미지정"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {/* 등번호 입력 */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-text-300 mb-3">
                <Hash className="w-4 h-4" />
                등번호
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={backNumber}
                onChange={(e) => setBackNumber(e.target.value)}
                placeholder="1~99"
                className="w-full px-4 py-3 rounded-lg bg-surface-700 text-white text-lg font-bold placeholder:text-text-400 placeholder:font-normal border border-white/5 focus:border-primary/50 focus:outline-none transition-colors"
              />
            </div>

            {/* 포지션 선택 (복수 선택) */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-text-300 mb-3">
                <MapPin className="w-4 h-4" />
                팀 포지션 <span className="text-text-500 font-normal">(복수 선택 가능)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {POSITIONS.map((pos) => {
                  const isSelected = selectedPositions.includes(pos.value);
                  return (
                    <button
                      key={pos.value}
                      type="button"
                      onClick={() => togglePosition(pos.value)}
                      className={`relative flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? "bg-primary text-white ring-2 ring-primary ring-offset-2 ring-offset-surface-800"
                          : "bg-surface-700 text-text-300 hover:bg-surface-600"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-bold">{pos.label}</span>
                        <span className={isSelected ? "text-white/80" : "text-text-500"}>
                          {pos.fullLabel}
                        </span>
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                  );
                })}
              </div>
              {userPreferredPosition && (
                <p className="mt-2 text-xs text-text-500">
                  선수 선호 포지션: {userPreferredPosition}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-surface-700 text-white hover:bg-surface-600 disabled:opacity-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
            >
              {isLoading ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
