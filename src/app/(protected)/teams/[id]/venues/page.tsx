"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Building2, PlusCircle, Star, X, Trash2 } from "lucide-react";
import { getTeamById } from "@/services/teams";
import { getTeamVenues, createVenue, deleteVenue, setPrimaryVenue } from "@/services/venues";
import { DaumPostcode, type DaumPostcodeData } from "@/components/daum-postcode";
import type { Team, Venue } from "@/types/supabase";

export default function VenuesPage() {
  const params = useParams();
  const teamId = params.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // 모달 상태
  const [venueName, setVenueName] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<{
    address: string;
    postalCode: string;
  } | null>(null);
  const [addressDetail, setAddressDetail] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [showPostcode, setShowPostcode] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [teamId]);

  async function loadData() {
    try {
      const [teamData, venuesData] = await Promise.all([
        getTeamById(teamId),
        getTeamVenues(teamId),
      ]);
      setTeam(teamData);
      setVenues(venuesData);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }

  function resetModal() {
    setVenueName("");
    setSelectedAddress(null);
    setAddressDetail("");
    setIsPrimary(false);
    setShowPostcode(false);
    setError(null);
  }

  function handleOpenModal() {
    resetModal();
    setShowModal(true);
  }

  function handleCloseModal() {
    setShowModal(false);
    resetModal();
  }

  const handlePostcodeComplete = (data: DaumPostcodeData) => {
    setSelectedAddress({
      address: data.address,
      postalCode: data.zonecode,
    });
    setShowPostcode(false);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedAddress) {
      setError("주소를 검색해주세요");
      return;
    }

    setSubmitLoading(true);

    try {
      const formData = new FormData();
      formData.set("team_id", teamId);
      formData.set("name", venueName);
      formData.set("address", selectedAddress.address);
      formData.set("postal_code", selectedAddress.postalCode);
      formData.set("address_detail", addressDetail);
      formData.set("is_primary", isPrimary ? "true" : "false");

      await createVenue(formData);
      await loadData();
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "경기장 등록에 실패했습니다");
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleDelete(venueId: string) {
    try {
      await deleteVenue(venueId);
      await loadData();
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error("Failed to delete venue:", err);
      alert("경기장 삭제에 실패했습니다");
    }
  }

  async function handleSetPrimary(venueId: string) {
    try {
      await setPrimaryVenue(venueId, teamId);
      await loadData();
    } catch (err) {
      console.error("Failed to set primary venue:", err);
      alert("기본 경기장 설정에 실패했습니다");
    }
  }

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-gray-400">로딩 중...</div>
      </main>
    );
  }

  if (!team) {
    return null;
  }

  return (
    <>
      <main className="flex-1 flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-[1000px] flex flex-col gap-8">
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/dashboard"
              className="text-gray-400 hover:text-[#00e677] transition-colors"
            >
              홈
            </Link>
            <span className="text-gray-600">/</span>
            <Link
              href={`/teams/${teamId}`}
              className="text-gray-400 hover:text-[#00e677] transition-colors"
            >
              {team.name}
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-[#00e677] font-medium">경기장 관리</span>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                경기장 관리
              </h1>
              <p className="text-gray-400 text-lg font-light">
                팀의 홈 경기장을 등록하고 관리합니다
              </p>
            </div>

            <button
              onClick={handleOpenModal}
              className="h-12 px-6 rounded-xl bg-[#00e677] text-[#0f2319] font-bold hover:bg-[#05c96b] hover:shadow-[0_0_20px_rgba(6,224,118,0.3)] transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-5 h-5" />
              경기장 등록
            </button>
          </div>

          {venues.length === 0 ? (
            <div className="bg-[#183527]/30 rounded-2xl p-12 md:p-16 border border-[#2f6a4d]/50 text-center">
              <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                등록된 경기장이 없습니다
              </h3>
              <p className="text-gray-400 mb-6">
                팀의 홈 경기장을 등록하면 경기 생성 시 빠르게 선택할 수 있습니다
              </p>
              <button
                onClick={handleOpenModal}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#00e677] text-[#0f2319] font-bold hover:bg-[#05c96b] hover:shadow-[0_0_20px_rgba(6,224,118,0.3)] transition-all"
              >
                <Building2 className="w-5 h-5" />
                첫 경기장 등록하기
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {venues.map((venue) => (
                <div
                  key={venue.id}
                  className="bg-[#183527]/30 rounded-2xl p-6 border border-[#2f6a4d]/50 hover:border-[#00e677]/50 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-white group-hover:text-[#00e677] transition-colors">
                          {venue.name}
                        </h3>
                        {venue.is_primary && (
                          <div className="flex items-center gap-1 bg-[#00e677]/20 text-[#00e677] px-2.5 py-1 rounded-full">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span className="text-xs font-bold">기본</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-start gap-2 text-gray-400">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p>{venue.address}</p>
                          {venue.address_detail && (
                            <p className="text-gray-500">{venue.address_detail}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {venue.postal_code && (
                    <div className="text-xs text-gray-500 mb-4">
                      우편번호: {venue.postal_code}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-4 border-t border-[#2f6a4d]/50">
                    {!venue.is_primary && (
                      <button
                        onClick={() => handleSetPrimary(venue.id)}
                        className="flex-1 h-10 px-4 rounded-lg bg-[#183527] border border-[#2f6a4d] text-gray-300 font-medium hover:border-[#00e677] hover:text-[#00e677] transition-all flex items-center justify-center gap-2"
                      >
                        <Star className="w-4 h-4" />
                        기본으로 설정
                      </button>
                    )}
                    <button
                      onClick={() => setShowDeleteConfirm(venue.id)}
                      className="flex-1 h-10 px-4 rounded-lg bg-[#183527] border border-[#2f6a4d] text-gray-300 font-medium hover:border-red-500 hover:text-red-400 transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f2319] rounded-2xl border border-[#2f6a4d] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0f2319] border-b border-[#2f6a4d] p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">경기장 등록</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-gray-300 text-sm font-medium">
                  경기장명 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="예: 잠실종합운동장 보조경기장"
                  required
                  className="w-full bg-[#183527] border border-[#2f6a4d] rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#00e677] focus:ring-1 focus:ring-[#00e677] transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-gray-300 text-sm font-medium">
                  주소 검색 <span className="text-red-400">*</span>
                </label>

                {!selectedAddress && !showPostcode && (
                  <button
                    type="button"
                    onClick={() => setShowPostcode(true)}
                    className="w-full h-[54px] bg-[#183527] border border-[#2f6a4d] rounded-xl px-4 py-3.5 text-gray-400 hover:border-[#00e677] hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-5 h-5" />
                    주소 검색하기
                  </button>
                )}

                {selectedAddress && !showPostcode && (
                  <div className="bg-[#183527] border border-[#00e677] rounded-xl px-4 py-3.5 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 mb-1">
                        우편번호: {selectedAddress.postalCode}
                      </p>
                      <p className="text-white">{selectedAddress.address}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedAddress(null)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {showPostcode && (
                  <div className="bg-[#183527] border border-[#2f6a4d] rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#2f6a4d]">
                      <h4 className="text-white font-medium">주소 검색</h4>
                      <button
                        type="button"
                        onClick={() => setShowPostcode(false)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <DaumPostcode onComplete={handlePostcodeComplete} height={400} />
                  </div>
                )}
              </div>

              {selectedAddress && (
                <div className="flex flex-col gap-2">
                  <label className="text-gray-300 text-sm font-medium">상세 주소</label>
                  <input
                    type="text"
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    placeholder="동/호수 등 상세 주소를 입력하세요"
                    className="w-full bg-[#183527] border border-[#2f6a4d] rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#00e677] focus:ring-1 focus:ring-[#00e677] transition-all"
                  />
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="w-5 h-5 bg-[#183527] border border-[#2f6a4d] rounded focus:outline-none focus:ring-2 focus:ring-[#00e677] checked:bg-[#00e677] checked:border-[#00e677] transition-colors"
                />
                <div className="flex flex-col">
                  <span className="text-white font-medium">기본 경기장으로 설정</span>
                  <span className="text-sm text-gray-400">
                    경기 생성 시 자동으로 선택됩니다
                  </span>
                </div>
              </label>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 h-12 px-6 rounded-xl bg-[#183527] border border-[#2f6a4d] text-gray-300 font-medium hover:text-white hover:border-[#00e677] transition-all"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitLoading || !selectedAddress}
                  className="flex-1 h-12 px-6 rounded-xl bg-[#00e677] text-[#0f2319] font-bold hover:bg-[#05c96b] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitLoading ? "등록 중..." : "경기장 등록"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f2319] rounded-2xl border border-[#2f6a4d] max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">경기장 삭제</h3>
            <p className="text-gray-300 mb-6">
              정말로 이 경기장을 삭제하시겠습니까?
              <br />
              <span className="text-sm text-gray-400">
                이 경기장은 삭제 목록으로 이동됩니다. 기존 경기 기록에서는 계속 표시됩니다.
              </span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 h-12 px-6 rounded-xl bg-[#183527] border border-[#2f6a4d] text-gray-300 font-medium hover:text-white hover:border-[#00e677] transition-all"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 h-12 px-6 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
