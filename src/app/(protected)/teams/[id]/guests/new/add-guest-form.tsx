"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { User, Hash, Loader2, Check } from "lucide-react";
import { addGuestMember } from "@/services/teams";

interface AddGuestFormProps {
  teamId: string;
}

export function AddGuestForm({ teamId }: AddGuestFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [backNumber, setBackNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("용병 이름을 입력해주세요");
      return;
    }

    startTransition(async () => {
      try {
        const parsedBackNumber = backNumber ? parseInt(backNumber, 10) : undefined;

        if (backNumber && isNaN(parsedBackNumber!)) {
          setError("등번호는 숫자만 입력 가능합니다");
          return;
        }

        await addGuestMember(teamId, name.trim(), parsedBackNumber);
        setSuccess(true);
        setName("");
        setBackNumber("");

        // 잠시 후 리다이렉트
        setTimeout(() => {
          router.push(`/teams/${teamId}/manage/members`);
          router.refresh();
        }, 1000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "용병 추가에 실패했습니다");
      }
    });
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-[#00e677]/20 flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-[#00e677]" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">용병 추가 완료!</h3>
        <p className="text-text-400 text-sm">멤버 관리 페이지로 이동합니다...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 이름 입력 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white">
          용병 이름 <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="용병 이름을 입력하세요"
            className="w-full h-12 px-4 pr-12 rounded-xl bg-surface-700 border border-white/10 text-white placeholder:text-text-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500 transition-all"
            disabled={isPending}
          />
          <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-400" />
        </div>
        <p className="text-xs text-text-400">
          경기 기록에 표시될 이름입니다
        </p>
      </div>

      {/* 등번호 입력 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white">
          등번호 <span className="text-text-400">(선택)</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={backNumber}
            onChange={(e) => setBackNumber(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="등번호 (숫자만)"
            maxLength={3}
            className="w-full h-12 px-4 pr-12 rounded-xl bg-surface-700 border border-white/10 text-white placeholder:text-text-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500 transition-all"
            disabled={isPending}
          />
          <Hash className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-400" />
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* 안내 메시지 */}
      <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
        <h4 className="text-sm font-medium text-yellow-400 mb-2">용병 안내</h4>
        <ul className="text-xs text-yellow-400/80 space-y-1">
          <li>• 용병은 실제 가입하지 않은 임시 선수입니다</li>
          <li>• 경기 기록에 포함되며, 나중에 실제 사용자에게 기록을 병합할 수 있습니다</li>
          <li>• 병합하려면 &quot;기록 병합&quot; 메뉴를 사용하세요</li>
        </ul>
      </div>

      {/* 제출 버튼 */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 h-12 rounded-xl bg-surface-700 hover:bg-surface-dark-hover text-white font-semibold transition-colors"
          disabled={isPending}
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="flex-1 h-12 rounded-xl bg-[#00e677] hover:bg-green-400 text-[#0f2319] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              추가 중...
            </>
          ) : (
            "용병 추가"
          )}
        </button>
      </div>
    </form>
  );
}
