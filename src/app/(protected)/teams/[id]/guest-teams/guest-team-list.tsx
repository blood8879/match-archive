"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Shield, MapPin, Search } from "lucide-react";
import { Select, SelectItem } from "@/components/ui/select";
import { createGuestTeam, deleteGuestTeam } from "@/services/guest-teams";
import { useRouter } from "next/navigation";
import type { GuestTeam } from "@/services/guest-teams";
import { AlertModal, type AlertType } from "@/components/ui/alert-modal";

interface GuestTeamListProps {
  teamId: string;
  initialGuestTeams: GuestTeam[];
}

export function GuestTeamList({ teamId, initialGuestTeams }: GuestTeamListProps) {
  const router = useRouter();
  const [guestTeams, setGuestTeams] = useState(initialGuestTeams);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // AlertModal 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    type: AlertType;
    message: string;
    showCancel?: boolean;
    onConfirm?: () => void;
  }>({ type: "info", message: "" });

  const showModal = (
    type: AlertType,
    message: string,
    showCancel = false,
    onConfirm?: () => void
  ) => {
    setModalConfig({ type, message, showCancel, onConfirm });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const newGuestTeam = await createGuestTeam(teamId, formData);
      setGuestTeams([...guestTeams, newGuestTeam]);
      setShowForm(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "게스트팀 생성에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (guestTeamId: string) => {
    showModal(
      "warning",
      "이 게스트팀을 삭제하시겠습니까?",
      true,
      async () => {
        try {
          await deleteGuestTeam(guestTeamId);
          setGuestTeams(guestTeams.filter((gt) => gt.id !== guestTeamId));
          router.refresh();
        } catch (err: any) {
          showModal("error", err.message || "게스트팀 삭제에 실패했습니다");
        }
      }
    );
  };

  // Filter guest teams based on search query
  const filteredGuestTeams = useMemo(() => {
    if (!searchQuery.trim()) return guestTeams;

    const query = searchQuery.toLowerCase();
    return guestTeams.filter((team) => {
      const nameMatch = team.name.toLowerCase().includes(query);
      const regionMatch = team.region?.toLowerCase().includes(query);
      return nameMatch || regionMatch;
    });
  }, [guestTeams, searchQuery]);

  return (
    <>
      <div className="space-y-4">
        {/* Add Button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full glass-panel rounded-2xl p-6 flex items-center justify-center gap-2 text-[#00e677] hover:bg-[#00e677]/10 transition-all border-2 border-dashed border-[#00e677]/30 hover:border-[#00e677]/60"
          >
            <Plus className="h-5 w-5" />
            <span className="font-semibold">새 게스트팀 추가</span>
          </button>
        )}

        {/* Add Form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="glass-panel rounded-2xl p-6 space-y-4 bg-[#214a36]/40"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">새 게스트팀 추가</h3>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                }}
                className="text-white/60 hover:text-white transition-colors"
              >
                취소
              </button>
            </div>

            <div className="space-y-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-white/80">
                  팀 이름 <span className="text-[#00e677]">*</span>
                </span>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="게스트팀 이름 입력"
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-12 pr-4 text-white placeholder-white/30 focus:border-[#00e677] focus:bg-black/30 focus:ring-1 focus:ring-[#00e677] outline-none transition-all"
                  />
                </div>
              </label>

              <Select
                label="지역"
                placeholder="선택하세요"
                icon={<MapPin className="w-5 h-5" />}
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

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-white/80">메모</span>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="팀에 대한 메모 (선택사항)"
                  className="w-full resize-none rounded-xl border border-white/10 bg-black/20 p-4 text-white placeholder-white/30 focus:border-[#00e677] focus:bg-black/30 focus:ring-1 focus:ring-[#00e677] outline-none transition-all"
                />
              </label>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                }}
                className="flex-1 rounded-xl px-6 py-3.5 text-sm font-bold text-white hover:bg-white/5 transition-all"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-[#00e677] px-8 py-3.5 text-sm font-bold text-[#0f2319] shadow-lg shadow-[#00e677]/20 hover:bg-green-400 hover:shadow-[#00e677]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "추가 중..." : "추가"}
              </button>
            </div>
          </form>
        )}

        {/* Search Bar */}
        {guestTeams.length > 0 && (
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="팀 이름 또는 지역으로 검색..."
              className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-12 pr-4 text-white placeholder-white/30 focus:border-[#00e677] focus:bg-black/30 focus:ring-1 focus:ring-[#00e677] outline-none transition-all"
            />
          </div>
        )}

        {/* Guest Teams List */}
        {guestTeams.length === 0 && !showForm ? (
          <div className="glass-panel rounded-2xl p-12 text-center">
            <Shield className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-white/60 mb-2">등록된 게스트팀이 없습니다</p>
            <p className="text-sm text-white/40">
              상대팀을 게스트팀으로 추가하여 경기 기록을 관리하세요
            </p>
          </div>
        ) : filteredGuestTeams.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center">
            <Search className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-white/60 mb-2">검색 결과가 없습니다</p>
            <p className="text-sm text-white/40">
              다른 검색어를 입력해보세요
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredGuestTeams.map((guestTeam) => (
              <div
                key={guestTeam.id}
                className="glass-panel rounded-2xl p-4 flex flex-col hover:bg-[#214a36]/30 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {guestTeam.emblem_url ? (
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-[#214a36] flex items-center justify-center flex-shrink-0">
                        <img
                          src={guestTeam.emblem_url}
                          alt={`${guestTeam.name} 엠블럼`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#214a36] flex items-center justify-center flex-shrink-0">
                        <Shield className="w-6 h-6 text-[#8eccae]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold truncate">{guestTeam.name}</h3>
                      <span className="inline-block px-2 py-0.5 rounded-full bg-[#00e677]/20 text-[#00e677] text-xs font-medium mt-1">
                        Guest
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(guestTeam.id)}
                    className="p-2 rounded-lg text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  {guestTeam.region && (
                    <div className="flex items-center gap-1.5 text-sm text-white/60">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{guestTeam.region}</span>
                    </div>
                  )}
                  {guestTeam.notes && (
                    <p className="text-sm text-white/40 line-clamp-2">{guestTeam.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        type={modalConfig.type}
        message={modalConfig.message}
        showCancel={modalConfig.showCancel}
        onConfirm={modalConfig.onConfirm}
      />
    </>
  );
}
