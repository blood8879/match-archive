"use client";

import { useState } from "react";
import { Plus, Trash2, Shield, MapPin } from "lucide-react";
import { createGuestTeam, deleteGuestTeam } from "@/services/guest-teams";
import { useRouter } from "next/navigation";
import type { GuestTeam } from "@/services/guest-teams";

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
    if (!confirm("이 게스트팀을 삭제하시겠습니까?")) return;

    try {
      await deleteGuestTeam(guestTeamId);
      setGuestTeams(guestTeams.filter((gt) => gt.id !== guestTeamId));
      router.refresh();
    } catch (err: any) {
      alert(err.message || "게스트팀 삭제에 실패했습니다");
    }
  };

  return (
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

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-white/80">지역</span>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <select
                  name="region"
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

      {/* Guest Teams List */}
      <div className="space-y-3">
        {guestTeams.length === 0 && !showForm && (
          <div className="glass-panel rounded-2xl p-12 text-center">
            <Shield className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-white/60 mb-2">등록된 게스트팀이 없습니다</p>
            <p className="text-sm text-white/40">
              상대팀을 게스트팀으로 추가하여 경기 기록을 관리하세요
            </p>
          </div>
        )}

        {guestTeams.map((guestTeam) => (
          <div
            key={guestTeam.id}
            className="glass-panel rounded-2xl p-5 flex items-center justify-between hover:bg-[#214a36]/30 transition-all"
          >
            <div className="flex items-center gap-4">
              {guestTeam.emblem_url ? (
                <div className="w-14 h-14 rounded-full overflow-hidden bg-[#214a36] flex items-center justify-center flex-shrink-0">
                  <img
                    src={guestTeam.emblem_url}
                    alt={`${guestTeam.name} 엠블럼`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-[#214a36] flex items-center justify-center flex-shrink-0">
                  <Shield className="w-7 h-7 text-[#8eccae]" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-bold">{guestTeam.name}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-[#00e677]/20 text-[#00e677] text-xs font-medium">
                    Guest
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-white/60">
                  {guestTeam.region && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {guestTeam.region}
                    </span>
                  )}
                  {guestTeam.notes && (
                    <span className="text-white/40">• {guestTeam.notes}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDelete(guestTeam.id)}
                className="p-2 rounded-lg text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
