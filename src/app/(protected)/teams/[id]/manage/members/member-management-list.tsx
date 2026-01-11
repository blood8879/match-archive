"use client";

import { useState, useMemo } from "react";
import { Check, X, MoreVertical, Search, Filter, Crown, Shield, User as UserIcon } from "lucide-react";
import {
  approveMember,
  rejectMember,
  updateMemberRole,
  removeMember,
} from "@/services/teams";
import type { TeamMemberWithUser } from "@/services/teams";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "./confirm-modal";

interface MemberManagementListProps {
  members: TeamMemberWithUser[];
  teamId: string;
  isOwner: boolean;
  showActions?: boolean;
}

type RoleFilter = "ALL" | "OWNER" | "MANAGER" | "MEMBER";
type PositionFilter = "ALL" | "FW" | "MF" | "DF" | "GK";

export function MemberManagementList({
  members,
  isOwner,
  showActions = false,
}: MemberManagementListProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("ALL");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "reject" | "remove" | null;
    memberId: string;
    memberName: string;
  }>({ isOpen: false, type: null, memberId: "", memberName: "" });

  const handleApprove = async (memberId: string) => {
    setLoadingId(memberId);
    try {
      await approveMember(memberId);
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (memberId: string, memberName: string) => {
    setConfirmModal({
      isOpen: true,
      type: "reject",
      memberId,
      memberName,
    });
  };

  const handleConfirmAction = async () => {
    const { type, memberId } = confirmModal;

    setLoadingId(memberId);
    try {
      if (type === "reject") {
        await rejectMember(memberId);
      } else if (type === "remove") {
        await removeMember(memberId);
      }
      router.refresh();
      setConfirmModal({ isOpen: false, type: null, memberId: "", memberName: "" });
      setOpenMenuId(null);
    } finally {
      setLoadingId(null);
    }
  };

  const handleRoleChange = async (
    memberId: string,
    role: "MANAGER" | "MEMBER"
  ) => {
    setLoadingId(memberId);
    try {
      await updateMemberRole(memberId, role);
      router.refresh();
      setOpenMenuId(null);
    } finally {
      setLoadingId(null);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    setConfirmModal({
      isOpen: true,
      type: "remove",
      memberId,
      memberName,
    });
  };

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const displayName =
        member.is_guest && member.guest_name
          ? member.guest_name
          : member.user?.nickname || "";

      const matchesSearch = displayName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      const matchesRole =
        roleFilter === "ALL" || member.role === roleFilter;

      const matchesPosition =
        positionFilter === "ALL" ||
        (!member.is_guest && member.user?.position === positionFilter);

      return matchesSearch && matchesRole && matchesPosition;
    });
  }, [members, searchQuery, roleFilter, positionFilter]);

  if (members.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-700 mb-4">
          <UserIcon className="w-8 h-8 text-text-400" />
        </div>
        <p className="text-text-400">멤버가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-400" />
          <input
            type="text"
            placeholder="이름으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-700 text-white placeholder:text-text-400 border border-white/5 focus:border-primary/50 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-400 pointer-events-none" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              className="pl-9 pr-8 py-2.5 rounded-lg bg-surface-700 text-white border border-white/5 focus:border-primary/50 focus:outline-none transition-colors appearance-none cursor-pointer"
            >
              <option value="ALL">모든 역할</option>
              <option value="OWNER">팀장</option>
              <option value="MANAGER">운영진</option>
              <option value="MEMBER">팀원</option>
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-400 pointer-events-none" />
            <select
              value={positionFilter}
              onChange={(e) =>
                setPositionFilter(e.target.value as PositionFilter)
              }
              className="pl-9 pr-8 py-2.5 rounded-lg bg-surface-700 text-white border border-white/5 focus:border-primary/50 focus:outline-none transition-colors appearance-none cursor-pointer"
            >
              <option value="ALL">모든 포지션</option>
              <option value="FW">FW</option>
              <option value="MF">MF</option>
              <option value="DF">DF</option>
              <option value="GK">GK</option>
            </select>
          </div>
        </div>
      </div>

      {filteredMembers.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-text-400">검색 결과가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMembers.map((member) => {
            const displayName =
              member.is_guest && member.guest_name
                ? member.guest_name
                : member.user?.nickname || "알 수 없음";
            const position = member.is_guest ? "용병" : member.user?.position;
            const isOwnerMember = member.role === "OWNER";
            const canManage = isOwner || (!isOwnerMember && !showActions);

            const roleConfig = {
              OWNER: {
                label: "팀장",
                icon: Crown,
                color: "text-yellow-400",
                bgColor: "bg-yellow-400/10",
              },
              MANAGER: {
                label: "운영진",
                icon: Shield,
                color: "text-primary",
                bgColor: "bg-primary/10",
              },
              MEMBER: {
                label: "팀원",
                icon: UserIcon,
                color: "text-text-400",
                bgColor: "bg-surface-700",
              },
            };

            const roleInfo = roleConfig[member.role];
            const RoleIcon = roleInfo.icon;

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 rounded-lg bg-surface-700 border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-800 text-base font-bold text-primary">
                      {member.back_number || displayName.charAt(0)}
                    </div>
                    <div
                      className={`absolute -bottom-1 -right-1 ${roleInfo.bgColor} rounded-full p-1 border-2 border-surface-700`}
                    >
                      <RoleIcon className={`w-3 h-3 ${roleInfo.color}`} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white truncate">
                        {displayName}
                      </p>
                      <span
                        className={`${roleInfo.bgColor} ${roleInfo.color} text-xs px-2 py-0.5 rounded-md font-medium`}
                      >
                        {roleInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {position && (
                        <span className="text-sm text-text-400">
                          {position}
                        </span>
                      )}
                      {member.back_number && (
                        <>
                          <span className="text-text-400">·</span>
                          <span className="text-sm text-text-400">
                            #{member.back_number}
                          </span>
                        </>
                      )}
                      <span className="text-text-400">·</span>
                      <span className="text-sm text-text-400">
                        {new Date(member.joined_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {showActions && (
                    <>
                      <button
                        onClick={() => handleApprove(member.id)}
                        disabled={loadingId === member.id}
                        className="p-2 rounded-lg bg-constructive/20 text-constructive hover:bg-constructive/30 disabled:opacity-50 transition-colors"
                        title="승인"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleReject(member.id, displayName)}
                        disabled={loadingId === member.id}
                        className="p-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 disabled:opacity-50 transition-colors"
                        title="거절"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </>
                  )}

                  {!showActions && canManage && !isOwnerMember && (
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenMenuId(
                            openMenuId === member.id ? null : member.id
                          )
                        }
                        disabled={loadingId === member.id}
                        className="p-2 rounded-lg hover:bg-surface-800 text-text-400 hover:text-white disabled:opacity-50 transition-colors"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {openMenuId === member.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 w-48 rounded-lg bg-surface-800 border border-white/10 shadow-xl z-20 py-1">
                            {member.role === "MANAGER" && (
                              <button
                                onClick={() =>
                                  handleRoleChange(member.id, "MEMBER")
                                }
                                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-surface-700 transition-colors"
                              >
                                팀원으로 변경
                              </button>
                            )}
                            {member.role === "MEMBER" && (
                              <button
                                onClick={() =>
                                  handleRoleChange(member.id, "MANAGER")
                                }
                                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-surface-700 transition-colors"
                              >
                                운영진으로 승격
                              </button>
                            )}
                            <button
                              onClick={() =>
                                handleRemoveMember(member.id, displayName)
                              }
                              className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-surface-700 transition-colors"
                            >
                              팀에서 제거
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() =>
          setConfirmModal({ isOpen: false, type: null, memberId: "", memberName: "" })
        }
        onConfirm={handleConfirmAction}
        title={
          confirmModal.type === "reject" ? "가입 신청 거절" : "팀원 제거"
        }
        message={
          confirmModal.type === "reject"
            ? `${confirmModal.memberName}님의 가입 신청을 거절하시겠습니까?`
            : `${confirmModal.memberName}님을 팀에서 제거하시겠습니까?`
        }
        confirmText={confirmModal.type === "reject" ? "거절" : "제거"}
        cancelText="취소"
        isLoading={loadingId === confirmModal.memberId}
        variant="destructive"
      />
    </div>
  );
}
