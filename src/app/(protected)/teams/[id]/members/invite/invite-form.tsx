"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTeamInvite, getUserByCode } from "@/services/invites";
import { Send, Loader2, CheckCircle } from "lucide-react";

interface InviteFormProps {
  teamId: string;
}

export function InviteForm({ teamId }: InviteFormProps) {
  const router = useRouter();
  const [userCode, setUserCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [foundUser, setFoundUser] = useState<{
    nickname: string | null;
  } | null>(null);

  const handleSearch = async () => {
    if (!userCode.trim()) {
      setError("유저 코드를 입력해주세요");
      return;
    }

    setIsLoading(true);
    setError("");
    setFoundUser(null);

    try {
      const user = await getUserByCode(userCode.trim());
      if (user) {
        setFoundUser({ nickname: user.nickname });
        setError("");
      } else {
        setError("존재하지 않는 유저 코드입니다");
      }
    } catch (err) {
      setError("유저 검색 중 오류가 발생했습니다");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userCode.trim()) {
      setError("유저 코드를 입력해주세요");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      await createTeamInvite(teamId, userCode.trim());
      setSuccess(true);
      setUserCode("");
      setFoundUser(null);
      router.refresh();

      // 성공 메시지 2초 후 자동 숨김
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "초대 전송에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="userCode"
          className="block text-sm font-medium text-white mb-2"
        >
          유저 코드
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            id="userCode"
            value={userCode}
            onChange={(e) => {
              setUserCode(e.target.value.toUpperCase());
              setError("");
              setFoundUser(null);
            }}
            placeholder="6자리 코드 입력 (예: ABC123)"
            maxLength={6}
            className="flex-1 px-4 py-3 bg-surface-700 border border-white/10 rounded-xl text-white placeholder:text-text-400 focus:outline-none focus:border-primary transition-colors font-mono text-lg tracking-wider"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isLoading || !userCode.trim()}
            className="px-6 py-3 rounded-xl bg-surface-700 hover:bg-surface-dark-hover text-white font-semibold transition-all border border-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "검색"
            )}
          </button>
        </div>

        {/* 검색 결과 표시 */}
        {foundUser && (
          <div className="mt-3 p-3 bg-constructive/10 border border-constructive/20 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-constructive" />
            <span className="text-white font-medium">
              {foundUser.nickname || "사용자"}님을 찾았습니다
            </span>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <p className="mt-2 text-sm text-destructive flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-destructive"></span>
            {error}
          </p>
        )}

        {/* 성공 메시지 */}
        {success && (
          <div className="mt-3 p-3 bg-constructive/10 border border-constructive/20 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-constructive" />
            <span className="text-white font-medium">초대를 전송했습니다!</span>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading || !foundUser}
        className="w-full h-12 px-6 rounded-xl bg-primary hover:bg-primary-dark text-black font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            초대 전송 중...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            초대 전송
          </>
        )}
      </button>

      <p className="text-sm text-text-400 leading-relaxed">
        💡 초대를 보내면 상대방에게 알림이 전송됩니다. 상대방이 수락하면 바로 팀에
        가입됩니다.
      </p>
    </form>
  );
}
