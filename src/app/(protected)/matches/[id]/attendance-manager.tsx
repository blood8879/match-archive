"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, HelpCircle, X, Loader2, Users, ChevronDown, ChevronUp } from "lucide-react";
import { updateMemberAttendance, type MatchAttendanceWithMember } from "@/services/matches";
import type { TeamMemberWithUser } from "@/services/teams";

interface AttendanceManagerProps {
  matchId: string;
  teamMembers: TeamMemberWithUser[];
  attendance: MatchAttendanceWithMember[];
  isFinished: boolean;
}

type AttendanceStatus = "attending" | "maybe" | "absent";

export function AttendanceManager({
  matchId,
  teamMembers,
  attendance,
  isFinished,
}: AttendanceManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // 활성 멤버 필터링 (일반 멤버 + 용병 모두 포함)
  const activeMembers = teamMembers.filter(
    (m) => m.status === "active" && (m.user_id || m.is_guest)
  );

  const getDisplayName = (member: TeamMemberWithUser): string => {
    return member.is_guest && member.guest_name
      ? member.guest_name
      : member.user?.nickname || "알 수 없음";
  };

  const sortByName = (a: TeamMemberWithUser, b: TeamMemberWithUser): number => {
    return getDisplayName(a).localeCompare(getDisplayName(b), "ko");
  };

  const getAttendanceStatus = (memberId: string): AttendanceStatus | null => {
    const record = attendance.find((a) => a.team_member_id === memberId);
    return record?.status ?? null;
  };

  const attendingMembers = activeMembers
    .filter((m) => getAttendanceStatus(m.id) === "attending")
    .sort(sortByName);
  const maybeMembers = activeMembers
    .filter((m) => getAttendanceStatus(m.id) === "maybe")
    .sort(sortByName);
  const absentMembers = activeMembers
    .filter((m) => getAttendanceStatus(m.id) === "absent")
    .sort(sortByName);
  const noResponseMembers = activeMembers
    .filter((m) => getAttendanceStatus(m.id) === null)
    .sort(sortByName);

  const handleStatusChange = async (
    memberId: string,
    status: AttendanceStatus
  ) => {
    if (isFinished) return;

    setLoadingMemberId(memberId);

    startTransition(async () => {
      try {
        await updateMemberAttendance(matchId, memberId, status);
        router.refresh();
      } catch (error) {
        console.error("Failed to update attendance:", error);
        alert(error instanceof Error ? error.message : "참석 상태 변경에 실패했습니다");
      } finally {
        setLoadingMemberId(null);
      }
    });
  };

  const renderMemberRow = (member: TeamMemberWithUser, currentStatus: AttendanceStatus | null) => {
    // 용병이면 guest_name 사용, 일반 멤버면 nickname 사용
    const displayName = member.is_guest && member.guest_name
      ? member.guest_name
      : member.user?.nickname || "알 수 없음";
    const isLoading = loadingMemberId === member.id && isPending;
    const isGuest = member.is_guest;

    return (
      <div
        key={member.id}
        className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#162e23] hover:bg-[#1e3a2c] transition-colors"
      >
        <div className="flex items-center gap-2">
          {member.user?.avatar_url ? (
            <img
              src={member.user.avatar_url}
              alt={displayName}
              className="size-7 rounded-full object-cover border border-[#214a36]"
            />
          ) : (
            <div className="size-7 rounded-full bg-[#214a36] flex items-center justify-center text-[#8eccae] text-xs font-bold">
              {displayName.charAt(0)}
            </div>
          )}
          <span className="text-white text-sm font-medium">{displayName}</span>
          {isGuest && (
            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              용병
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#8eccae]" />
          ) : (
            <>
              <button
                onClick={() => handleStatusChange(member.id, "attending")}
                disabled={isFinished || isPending}
                className={`p-1.5 rounded-md transition-colors ${
                  currentStatus === "attending"
                    ? "bg-[#00e677]/20 text-[#00e677]"
                    : "text-[#8eccae]/50 hover:text-[#00e677] hover:bg-[#00e677]/10"
                } disabled:opacity-50`}
                title="참석"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleStatusChange(member.id, "maybe")}
                disabled={isFinished || isPending}
                className={`p-1.5 rounded-md transition-colors ${
                  currentStatus === "maybe"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "text-[#8eccae]/50 hover:text-yellow-400 hover:bg-yellow-500/10"
                } disabled:opacity-50`}
                title="미정"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleStatusChange(member.id, "absent")}
                disabled={isFinished || isPending}
                className={`p-1.5 rounded-md transition-colors ${
                  currentStatus === "absent"
                    ? "bg-red-500/20 text-red-400"
                    : "text-[#8eccae]/50 hover:text-red-400 hover:bg-red-500/10"
                } disabled:opacity-50`}
                title="불참"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderSection = (
    title: string,
    members: TeamMemberWithUser[],
    status: AttendanceStatus | null,
    color: string
  ) => {
    if (members.length === 0) return null;

    return (
      <div className="space-y-2">
        <h5 className={`text-xs font-bold ${color} uppercase tracking-wider`}>
          {title} ({members.length})
        </h5>
        <div className="space-y-1">
          {members.map((member) => renderMemberRow(member, status))}
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-3 border-b border-[#214a36] bg-[#162e23]/50 flex items-center justify-between hover:bg-[#162e23]/70 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1 bg-[#00e677]/20 rounded-md">
            <Users className="h-4 w-4 text-[#00e677]" />
          </div>
          <h3 className="text-white text-sm font-bold">참석 관리</h3>
          <span className="text-[#8eccae] text-xs">
            (참석 {attendingMembers.length} / 미정 {maybeMembers.length} / 불참 {absentMembers.length})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-[#8eccae]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#8eccae]" />
        )}
      </button>

      {isExpanded && (
        <div className="p-5 space-y-4">
          {isFinished && (
            <p className="text-sm text-yellow-400 bg-yellow-500/10 rounded-lg px-3 py-2">
              경기가 종료되어 참석 상태를 변경할 수 없습니다.
            </p>
          )}

          {renderSection("참석", attendingMembers, "attending", "text-[#00e677]")}
          {renderSection("미정", maybeMembers, "maybe", "text-yellow-400")}
          {renderSection("불참", absentMembers, "absent", "text-red-400")}
          {renderSection("미응답", noResponseMembers, null, "text-[#8eccae]")}

          {activeMembers.length === 0 && (
            <p className="text-center text-[#8eccae] text-sm py-4">
              팀 멤버가 없습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
