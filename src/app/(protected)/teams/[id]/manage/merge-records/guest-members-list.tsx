"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Target, Trophy, Calendar, Hash, Search, Send, X, Loader2 } from "lucide-react";
import type { GuestMemberWithStats } from "@/types/supabase";
import { createRecordMergeRequest, getGuestMemberStats } from "@/services/record-merge";
import { getUserByCode } from "@/services/invites";
import { AlertModal, type AlertType } from "@/components/ui/alert-modal";

interface GuestMembersListProps {
  guests: GuestMemberWithStats[];
  teamId: string;
}

export function GuestMembersList({ guests, teamId }: GuestMembersListProps) {
  const router = useRouter();
  const [selectedGuest, setSelectedGuest] = useState<GuestMemberWithStats | null>(null);
  const [userCode, setUserCode] = useState("");
  const [foundUser, setFoundUser] = useState<{ id: string; nickname: string | null } | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [guestStats, setGuestStats] = useState<{
    matchCount: number;
    totalGoals: number;
    totalAssists: number;
    matches: Array<{
      id: string;
      match_date: string;
      opponent_name: string;
      goals: number;
      assists: number;
    }>;
  } | null>(null);

  // AlertModal 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    type: AlertType;
    message: string;
    navigateBack?: boolean;
  }>({ type: "info", message: "" });

  const showModal = (type: AlertType, message: string, navigateBack = false) => {
    setModalConfig({ type, message, navigateBack });
    setModalOpen(true);
  };

  const handleSelectGuest = async (guest: GuestMemberWithStats) => {
    setSelectedGuest(guest);
    setUserCode("");
    setFoundUser(null);

    // 용병 통계 로드
    try {
      const stats = await getGuestMemberStats(guest.id);
      setGuestStats(stats);
    } catch (error) {
      console.error("Failed to load guest stats:", error);
    }
  };

  const handleSearchUser = async () => {
    if (userCode.length !== 6) {
      showModal("warning", "유저 코드는 6자리입니다");
      return;
    }

    setSearching(true);
    setFoundUser(null);

    try {
      const user = await getUserByCode(userCode);
      if (user) {
        setFoundUser({ id: user.id, nickname: user.nickname });
      } else {
        showModal("error", "존재하지 않는 유저 코드입니다");
      }
    } catch (error) {
      showModal("error", "검색에 실패했습니다");
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedGuest || !foundUser) return;

    setSubmitting(true);

    try {
      await createRecordMergeRequest(teamId, selectedGuest.id, userCode);
      showModal("success", `${foundUser.nickname || "사용자"}님에게 기록 병합 요청을 전송했습니다.`);
      setSelectedGuest(null);
      setUserCode("");
      setFoundUser(null);
      setGuestStats(null);
      router.refresh();
    } catch (error) {
      showModal("error", error instanceof Error ? error.message : "요청 전송에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setSelectedGuest(null);
    setUserCode("");
    setFoundUser(null);
    setGuestStats(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {guests.map((guest) => (
          <div
            key={guest.id}
            className="p-4 rounded-xl bg-surface-700/50 border border-white/5 hover:border-purple-500/30 transition-colors cursor-pointer group"
            onClick={() => handleSelectGuest(guest)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-accent-500/20 flex items-center justify-center">
                  <span className="text-accent-500 font-bold text-sm">
                    {guest.guest_name?.charAt(0) || "?"}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                    {guest.guest_name || "이름 없음"}
                  </p>
                  <p className="text-xs text-text-muted">
                    가입: {new Date(guest.joined_at).toLocaleDateString("ko-KR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-text-400">
                  <Calendar className="w-4 h-4" />
                  <span>{guest.total_matches}경기</span>
                </div>
                <div className="flex items-center gap-1 text-primary">
                  <Target className="w-4 h-4" />
                  <span>{guest.total_goals}G</span>
                </div>
                <div className="flex items-center gap-1 text-blue-400">
                  <Trophy className="w-4 h-4" />
                  <span>{guest.total_assists}A</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 병합 요청 모달 */}
      {selectedGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-surface-800 rounded-2xl border border-white/10 shadow-2xl">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">기록 병합 요청</h3>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 용병 정보 */}
              <div className="p-4 rounded-xl bg-surface-700/50">
                <p className="text-sm text-text-muted mb-2">용병 정보</p>
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-accent-500/20 flex items-center justify-center">
                    <span className="text-accent-500 font-bold">
                      {selectedGuest.guest_name?.charAt(0) || "?"}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">{selectedGuest.guest_name}</p>
                    <p className="text-sm text-text-400">
                      {guestStats?.matchCount || 0}경기 / {guestStats?.totalGoals || 0}골 / {guestStats?.totalAssists || 0}어시
                    </p>
                  </div>
                </div>

                {/* 최근 경기 기록 */}
                {guestStats && guestStats.matches.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-text-muted mb-2">최근 경기 기록</p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {guestStats.matches.slice(0, 5).map((match) => (
                        <div
                          key={match.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-text-muted">
                              {new Date(match.match_date).toLocaleDateString("ko-KR", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <span className="text-white">vs {match.opponent_name}</span>
                          </div>
                          <span className="text-text-400">
                            {match.goals > 0 && `${match.goals}G`}
                            {match.goals > 0 && match.assists > 0 && " "}
                            {match.assists > 0 && `${match.assists}A`}
                            {match.goals === 0 && match.assists === 0 && "-"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 유저 코드 입력 */}
              <div>
                <label className="block text-sm font-medium text-text-400 mb-2">
                  대상 유저 코드
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="text"
                      value={userCode}
                      onChange={(e) => {
                        setUserCode(e.target.value.toUpperCase());
                        setFoundUser(null);
                      }}
                      maxLength={6}
                      placeholder="6자리 유저 코드"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-700 border border-white/10 text-white placeholder-text-muted focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none font-mono tracking-wider uppercase"
                    />
                  </div>
                  <button
                    onClick={handleSearchUser}
                    disabled={userCode.length !== 6 || searching}
                    className="px-4 py-3 rounded-xl bg-purple-500/20 text-purple-400 font-semibold hover:bg-purple-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {searching ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                    검색
                  </button>
                </div>
              </div>

              {/* 검색 결과 */}
              {foundUser && (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <span className="text-green-400 font-bold">
                        {foundUser.nickname?.charAt(0) || "?"}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-white">{foundUser.nickname || "닉네임 없음"}</p>
                      <p className="text-xs text-green-400">사용자를 찾았습니다</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/10 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 py-3 rounded-xl bg-surface-700 text-white font-semibold hover:bg-surface-dark-hover transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={!foundUser || submitting}
                className="flex-1 py-3 rounded-xl bg-purple-500 text-white font-semibold hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                병합 요청 전송
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        type={modalConfig.type}
        message={modalConfig.message}
        navigateBack={modalConfig.navigateBack}
      />
    </>
  );
}
