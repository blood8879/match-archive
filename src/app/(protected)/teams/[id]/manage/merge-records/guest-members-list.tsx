"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Target, Trophy, Calendar, Hash, Search, Send, X, Loader2, Users, ChevronDown } from "lucide-react";
import type { GuestMemberWithStats } from "@/types/supabase";
import type { TeamMemberWithUser } from "@/services/teams";
import { createRecordMergeRequest, getGuestMemberStats, checkUserTeamMembership, directMergeGuestRecords } from "@/services/record-merge";
import { getUserByCode } from "@/services/invites";
import { AlertModal, type AlertType } from "@/components/ui/alert-modal";

interface GuestMembersListProps {
  guests: GuestMemberWithStats[];
  teamId: string;
  teamMembers: TeamMemberWithUser[];
}

export function GuestMembersList({ guests, teamId, teamMembers }: GuestMembersListProps) {
  const router = useRouter();
  const [selectedGuest, setSelectedGuest] = useState<GuestMemberWithStats | null>(null);
  const [userCode, setUserCode] = useState("");
  const [foundUser, setFoundUser] = useState<{ id: string; nickname: string | null } | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isActiveTeamMember, setIsActiveTeamMember] = useState(false);
  const [showDirectMergeConfirm, setShowDirectMergeConfirm] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMemberWithUser | null>(null);
  const [mergeMode, setMergeMode] = useState<"team" | "code">("team");
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

  const activeTeamMembers = teamMembers.filter(
    (m) => m.status === "active" && !m.is_guest && m.user_id
  );

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
    setIsActiveTeamMember(false);
    setShowDirectMergeConfirm(false);
    setSelectedTeamMember(null);
    setMergeMode("team");

    // 용병 통계 로드
    try {
      const stats = await getGuestMemberStats(guest.id);
      setGuestStats(stats);
    } catch (error) {
      console.error("Failed to load guest stats:", error);
    }
  };

  const handleSelectTeamMember = (member: TeamMemberWithUser) => {
    setSelectedTeamMember(member);
    if (member.user_id) {
      setFoundUser({ id: member.user_id, nickname: member.user?.nickname || null });
      setIsActiveTeamMember(true);
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
        try {
          const { isMember } = await checkUserTeamMembership(teamId, user.id);
          setIsActiveTeamMember(isMember);
        } catch (err) {
          console.error("Failed to check membership:", err);
          setIsActiveTeamMember(false);
        }
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
      closeModal();
      router.refresh();
    } catch (error) {
      showModal("error", error instanceof Error ? error.message : "요청 전송에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectMerge = async () => {
    if (!selectedGuest || !foundUser) return;

    setSubmitting(true);

    try {
      const result = await directMergeGuestRecords(teamId, selectedGuest.id, foundUser.id);
      if (result.success) {
        showModal("success", "기록이 성공적으로 병합되었습니다.");
        closeModal();
        router.refresh();
      } else {
        showModal("error", result.error || "병합에 실패했습니다");
      }
    } catch (error) {
      showModal("error", error instanceof Error ? error.message : "병합 중 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setSelectedGuest(null);
    setUserCode("");
    setFoundUser(null);
    setGuestStats(null);
    setIsActiveTeamMember(false);
    setShowDirectMergeConfirm(false);
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
                <h3 className="text-xl font-bold text-white">
                  {showDirectMergeConfirm ? "기록 병합 확인" : "기록 병합 요청"}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>
            </div>

            {showDirectMergeConfirm && foundUser ? (
              <>
                <div className="p-6 space-y-6">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-200">
                    <p className="font-bold mb-1">주의: 이 작업은 되돌릴 수 없습니다.</p>
                    <p>
                      <span className="font-semibold text-white">{selectedGuest.guest_name}</span>님의
                      모든 기록(경기, 골, 어시스트)이{" "}
                      <span className="font-semibold text-white">{foundUser.nickname}</span>님에게
                      영구적으로 통합됩니다.
                    </p>
                  </div>

                  <div className="bg-surface-700/50 rounded-xl p-4">
                    <p className="text-sm text-text-muted mb-3">병합될 기록 미리보기</p>
                    <div className="grid grid-cols-3 gap-2 text-center mb-4">
                      <div className="bg-surface-800 p-3 rounded-lg">
                        <p className="text-xs text-text-muted mb-1">경기</p>
                        <p className="font-bold text-white">{guestStats?.matchCount || 0}</p>
                      </div>
                      <div className="bg-surface-800 p-3 rounded-lg">
                        <p className="text-xs text-text-muted mb-1">골</p>
                        <p className="font-bold text-primary">{guestStats?.totalGoals || 0}</p>
                      </div>
                      <div className="bg-surface-800 p-3 rounded-lg">
                        <p className="text-xs text-text-muted mb-1">어시스트</p>
                        <p className="font-bold text-blue-400">{guestStats?.totalAssists || 0}</p>
                      </div>
                    </div>
                    {guestStats?.matches && guestStats.matches.length > 0 && (
                      <div>
                        <p className="text-xs text-text-muted mb-2">최근 경기</p>
                        <ul className="space-y-1 text-sm text-text-400 max-h-24 overflow-y-auto">
                          {guestStats.matches.slice(0, 3).map((match) => (
                            <li key={match.id} className="flex justify-between">
                              <span>
                                {new Date(match.match_date).toLocaleDateString()} vs {match.opponent_name}
                              </span>
                              <span>
                                {match.goals}G {match.assists}A
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 border-t border-white/10 flex gap-3">
                  <button
                    onClick={() => setShowDirectMergeConfirm(false)}
                    className="flex-1 py-3 rounded-xl bg-surface-700 text-white font-semibold hover:bg-surface-dark-hover transition-colors"
                  >
                    이전으로
                  </button>
                  <button
                    onClick={handleDirectMerge}
                    disabled={submitting}
                    className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Hash className="w-5 h-5" />
                    )}
                    병합 확정
                  </button>
                </div>
              </>
            ) : (
              <>
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
                          {guestStats?.matchCount || 0}경기 / {guestStats?.totalGoals || 0}골 /{" "}
                          {guestStats?.totalAssists || 0}어시
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

                  {/* 모드 선택 탭 */}
                  <div className="flex rounded-xl bg-surface-700 p-1">
                    <button
                      onClick={() => {
                        setMergeMode("team");
                        setFoundUser(null);
                        setSelectedTeamMember(null);
                        setUserCode("");
                      }}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                        mergeMode === "team"
                          ? "bg-green-600 text-white"
                          : "text-text-400 hover:text-white"
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      팀원 선택
                    </button>
                    <button
                      onClick={() => {
                        setMergeMode("code");
                        setFoundUser(null);
                        setSelectedTeamMember(null);
                        setUserCode("");
                      }}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                        mergeMode === "code"
                          ? "bg-purple-600 text-white"
                          : "text-text-400 hover:text-white"
                      }`}
                    >
                      <Hash className="w-4 h-4" />
                      유저 코드
                    </button>
                  </div>

                  {mergeMode === "team" ? (
                    <>
                      {/* 팀원 목록에서 선택 */}
                      <div>
                        <label className="block text-sm font-medium text-text-400 mb-2">
                          병합 대상 팀원 선택
                        </label>
                        {activeTeamMembers.length > 0 ? (
                          <div className="max-h-48 overflow-y-auto space-y-2 rounded-xl bg-surface-700/50 p-2">
                            {activeTeamMembers.map((member) => (
                              <button
                                key={member.id}
                                onClick={() => handleSelectTeamMember(member)}
                                className={`w-full p-3 rounded-lg text-left transition-colors flex items-center gap-3 ${
                                  selectedTeamMember?.id === member.id
                                    ? "bg-green-600/20 border border-green-500/50"
                                    : "bg-surface-800 hover:bg-surface-700 border border-transparent"
                                }`}
                              >
                                <div className="size-10 rounded-full bg-surface-700 flex items-center justify-center overflow-hidden">
                                  {member.user?.avatar_url ? (
                                    <img
                                      src={member.user.avatar_url}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-text-muted font-bold">
                                      {member.user?.nickname?.charAt(0) || "?"}
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-white truncate">
                                    {member.user?.nickname || "이름 없음"}
                                  </p>
                                  <p className="text-xs text-text-muted">
                                    {member.role === "OWNER" ? "팀장" : member.role === "MANAGER" ? "운영진" : "팀원"}
                                    {member.back_number && ` · #${member.back_number}`}
                                  </p>
                                </div>
                                {selectedTeamMember?.id === member.id && (
                                  <div className="text-green-400">
                                    <ChevronDown className="w-5 h-5 rotate-180" />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-surface-700/50 text-center text-text-muted">
                            병합 가능한 팀원이 없습니다
                          </div>
                        )}
                      </div>

                      {/* 선택된 팀원 표시 */}
                      {selectedTeamMember && (
                        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-green-500/20 flex items-center justify-center">
                              <span className="text-green-400 font-bold">
                                {selectedTeamMember.user?.nickname?.charAt(0) || "?"}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-white">
                                {selectedTeamMember.user?.nickname || "닉네임 없음"}
                              </p>
                              <p className="text-xs text-green-400">선택된 팀원</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
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
                                setIsActiveTeamMember(false);
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
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="size-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                <span className="text-green-400 font-bold">
                                  {foundUser.nickname?.charAt(0) || "?"}
                                </span>
                              </div>
                              <div>
                                <p className="font-semibold text-white">
                                  {foundUser.nickname || "닉네임 없음"}
                                </p>
                                <p className="text-xs text-green-400">사용자를 찾았습니다</p>
                              </div>
                            </div>
                            {isActiveTeamMember && (
                              <div className="px-2 py-1 rounded bg-green-500 text-white text-xs font-bold">
                                이미 팀 멤버입니다
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="p-6 border-t border-white/10 flex gap-3">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-3 rounded-xl bg-surface-700 text-white font-semibold hover:bg-surface-dark-hover transition-colors"
                  >
                    취소
                  </button>
                  {mergeMode === "team" ? (
                    <button
                      onClick={() => setShowDirectMergeConfirm(true)}
                      disabled={!selectedTeamMember}
                      className="flex-1 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Users className="w-5 h-5" />
                      바로 병합
                    </button>
                  ) : isActiveTeamMember ? (
                    <button
                      onClick={() => setShowDirectMergeConfirm(true)}
                      disabled={!foundUser}
                      className="flex-1 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Hash className="w-5 h-5" />
                      바로 병합
                    </button>
                  ) : (
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
                  )}
                </div>
              </>
            )}
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
