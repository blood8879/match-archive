"use client";

import { useState, useEffect } from "react";
import { X, Hash, MapPin } from "lucide-react";
import { updateMemberInfo } from "@/services/teams";
import type { TeamMemberWithUser } from "@/services/teams";
import { useRouter } from "next/navigation";

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMemberWithUser | null;
}

type Position = "FW" | "MF" | "DF" | "GK" | null;

const POSITIONS: { value: Position; label: string }[] = [
  { value: null, label: "미지정" },
  { value: "FW", label: "FW (공격수)" },
  { value: "MF", label: "MF (미드필더)" },
  { value: "DF", label: "DF (수비수)" },
  { value: "GK", label: "GK (골키퍼)" },
];

export function EditMemberModal({
  isOpen,
  onClose,
  member,
}: EditMemberModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [teamPosition, setTeamPosition] = useState<Position>(null);
  const [backNumber, setBackNumber] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      setTeamPosition(member.team_position ?? null);
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
        team_position: teamPosition,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md mx-4 bg-surface-800 rounded-xl border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">팀원 정보 수정</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-700 text-text-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-surface-700">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-800 text-base font-bold text-primary">
              {member.back_number || displayName.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-white">{displayName}</p>
              {userPreferredPosition && (
                <p className="text-sm text-text-400">
                  선호 포지션: {userPreferredPosition}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-text-300 mb-2">
                <MapPin className="w-4 h-4" />
                팀 포지션
              </label>
              <div className="grid grid-cols-2 gap-2">
                {POSITIONS.map((pos) => (
                  <button
                    key={pos.value ?? "none"}
                    type="button"
                    onClick={() => setTeamPosition(pos.value)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      teamPosition === pos.value
                        ? "bg-primary text-white"
                        : "bg-surface-700 text-text-300 hover:bg-surface-600"
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
              {userPreferredPosition && teamPosition && teamPosition !== userPreferredPosition && (
                <p className="mt-2 text-xs text-yellow-400">
                  사용자 선호 포지션({userPreferredPosition})과 다릅니다
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-text-300 mb-2">
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
                className="w-full px-4 py-2.5 rounded-lg bg-surface-700 text-white placeholder:text-text-400 border border-white/5 focus:border-primary/50 focus:outline-none transition-colors"
              />
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
