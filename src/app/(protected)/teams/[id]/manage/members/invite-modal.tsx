"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTeamInvite, getUserByCode } from "@/services/invites";
import { X, Send, Loader2, CheckCircle, Search, UserPlus } from "lucide-react";

interface InviteModalProps {
  teamId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function InviteModal({ teamId, isOpen, onClose }: InviteModalProps) {
  const router = useRouter();
  const [userCode, setUserCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [foundUser, setFoundUser] = useState<{ nickname: string | null } | null>(null);

  const resetState = () => {
    setUserCode("");
    setError("");
    setSuccess(false);
    setFoundUser(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSearch = async () => {
    if (!userCode.trim() || userCode.length !== 6) {
      setError("6자리 유저 코드를 입력해주세요");
      return;
    }

    setIsLoading(true);
    setError("");
    setFoundUser(null);

    try {
      const user = await getUserByCode(userCode.trim());
      if (user) {
        setFoundUser({ nickname: user.nickname });
      } else {
        setError("존재하지 않는 유저 코드입니다");
      }
    } catch {
      setError("유저 검색 중 오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!foundUser) return;

    setIsLoading(true);
    setError("");

    try {
      await createTeamInvite(teamId, userCode.trim());
      setSuccess(true);
      router.refresh();
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "초대 전송에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl bg-[#1a3429] border border-[#8eccae]/20 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">팀원 초대</h3>
              <p className="text-sm text-white/50">유저 코드로 초대하기</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">초대 전송 완료!</h4>
              <p className="text-sm text-white/60">
                {foundUser?.nickname}님에게 초대 알림이 전송되었습니다
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  유저 코드 입력
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userCode}
                    onChange={(e) => {
                      setUserCode(e.target.value.toUpperCase());
                      setError("");
                      setFoundUser(null);
                    }}
                    placeholder="6자리 코드 (예: ABC123)"
                    maxLength={6}
                    className="flex-1 px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-primary transition-colors font-mono text-lg tracking-wider"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={isLoading || userCode.length !== 6}
                    className="px-4 py-3 rounded-xl bg-[#214a36] hover:bg-[#2b5d45] text-white font-medium transition-all border border-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {foundUser && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{foundUser.nickname || "사용자"}</p>
                    <p className="text-sm text-white/50">초대 가능합니다</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <p className="text-xs text-white/40 leading-relaxed">
                초대를 보내면 상대방에게 알림이 전송됩니다. 상대방이 수락하면 바로 팀에 가입됩니다.
              </p>
            </>
          )}
        </div>

        {!success && (
          <div className="p-6 pt-0">
            <button
              onClick={handleSubmit}
              disabled={isLoading || !foundUser}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-black font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  전송 중...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  초대 전송
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
