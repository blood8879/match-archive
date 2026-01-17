"use server";

import { createClient } from "@/lib/supabase/server";
import { generateInviteCode } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type { Team, TeamMember, User } from "@/types/supabase";

export type TeamMemberWithUser = TeamMember & {
  user: Pick<User, "id" | "nickname" | "avatar_url" | "position"> | null;
};

interface GetTeamsOptions {
  region?: string;
  query?: string;
  day?: string;
  level?: string;
  recruiting?: string;
}

export async function getTeams(options: GetTeamsOptions = {}): Promise<Team[]> {
  const { region, query, day, level, recruiting } = options;
  const supabase = await createClient();

  let q = supabase
    .from("teams")
    .select("*")
    .order("created_at", { ascending: false });

  if (region) {
    q = q.ilike("region", `%${region}%`);
  }

  if (query) {
    q = q.ilike("name", `%${query}%`);
  }

  if (day) {
    if (day === "평일") {
      q = q.overlaps("activity_days", ["월", "화", "수", "목", "금"]);
    } else if (day === "주말") {
      q = q.overlaps("activity_days", ["토", "일"]);
    } else {
      q = q.contains("activity_days", [day]);
    }
  }

  if (level) {
    const [minStr, maxStr] = level.split("-");
    const min = parseInt(minStr, 10);
    const max = maxStr ? parseInt(maxStr, 10) : min;
    q = q.gte("level", min).lte("level", max);
  }

  if (recruiting === "recruiting") {
    q = q.eq("is_recruiting", true);
  } else if (recruiting === "not-recruiting") {
    q = q.eq("is_recruiting", false);
  }

  const { data, error } = await q;

  if (error) throw error;
  return data as Team[];
}

export async function getTeamById(id: string): Promise<Team | null> {
  const supabase = await createClient();

  const { data, error} = await supabase
    .from("teams")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[getTeamById] Error fetching team:", {
      id,
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  console.log("[getTeamById] Success:", { id, teamName: data?.name });
  return data as Team;
}

export async function getTeamMembers(teamId: string): Promise<TeamMemberWithUser[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("team_members")
    .select("*, user:users(id, nickname, avatar_url, position)")
    .eq("team_id", teamId)
    .order("role", { ascending: true })
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("[getTeamMembers] Error fetching members:", {
      teamId,
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  console.log("[getTeamMembers] Success:", {
    teamId,
    memberCount: data?.length,
  });

  return data as TeamMemberWithUser[];
}

export async function createTeam(formData: FormData): Promise<Team> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("로그인이 필요합니다");

  const name = formData.get("name") as string;
  const region = formData.get("region") as string;
  const emblemFile = formData.get("emblem") as File | null;

  if (!name) throw new Error("팀 이름은 필수입니다");

  let emblemUrl: string | null = null;

  if (emblemFile && emblemFile.size > 0) {
    // 파일 크기 검증 (5MB)
    if (emblemFile.size > 5 * 1024 * 1024) {
      throw new Error("파일 크기는 5MB를 초과할 수 없습니다");
    }

    // 파일 타입 검증
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(emblemFile.type)) {
      throw new Error("지원되지 않는 이미지 형식입니다 (JPG, PNG, WebP, SVG만 가능)");
    }

    // 파일명 생성
    const fileExt = emblemFile.name.split(".").pop();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const fileName = `${timestamp}_${randomStr}.${fileExt}`;
    const path = `${user.id}/${fileName}`;

    // 파일 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("team-emblems")
      .upload(path, emblemFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`이미지 업로드 실패: ${uploadError.message}`);
    }

    // Public URL 생성
    const {
      data: { publicUrl },
    } = supabase.storage.from("team-emblems").getPublicUrl(uploadData.path);

    emblemUrl = publicUrl;
  }

  // Use database function for atomic team creation with owner
  // This bypasses RLS issues where owner cannot insert themselves into team_members
  const { data: team, error } = await supabase.rpc("create_team_with_owner", {
    p_name: name,
    p_region: region || null,
    p_code: generateInviteCode(),
    p_emblem_url: emblemUrl,
  });

  if (error) {
    console.error("Failed to create team:", error);
    throw new Error("팀 생성에 실패했습니다");
  }

  if (!team) {
    throw new Error("팀 생성에 실패했습니다");
  }

  const typedTeam = team as Team;

  revalidatePath("/teams");
  revalidatePath("/dashboard");

  return typedTeam;
}

export async function updateTeam(teamId: string, formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("로그인이 필요합니다");

  // 권한 확인
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  if (!membership || (membership.role !== "OWNER" && membership.role !== "MANAGER")) {
    throw new Error("권한이 없습니다");
  }

  const name = formData.get("name") as string;
  const region = formData.get("region") as string;
  const emblemFile = formData.get("emblem") as File | null;
  const hashtagsJson = formData.get("hashtags") as string | null;
  const description = formData.get("description") as string | null;
  const activityDaysJson = formData.get("activity_days") as string | null;
  const isRecruiting = formData.get("is_recruiting") === "true";
  const recruitingPositionsJson = formData.get("recruiting_positions") as string | null;
  const levelStr = formData.get("level") as string | null;
  const level = levelStr ? parseInt(levelStr, 10) : 1;

  if (!name) throw new Error("팀 이름은 필수입니다");

  // 해시태그 파싱 및 검증
  let hashtags: string[] = [];
  if (hashtagsJson) {
    try {
      hashtags = JSON.parse(hashtagsJson);
      if (!Array.isArray(hashtags)) {
        throw new Error("해시태그 형식이 올바르지 않습니다");
      }
      if (hashtags.length > 5) {
        throw new Error("해시태그는 최대 5개까지 입력 가능합니다");
      }
      // 각 해시태그 정리 (# 제거 후 다시 추가)
      hashtags = hashtags.map((tag) => {
        const cleaned = tag.trim().replace(/^#/, "");
        return cleaned ? `#${cleaned}` : "";
      }).filter(Boolean);
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error("해시태그 형식이 올바르지 않습니다");
      }
      throw e;
    }
  }

  // 활동 요일 파싱
  let activityDays: string[] = [];
  if (activityDaysJson) {
    try {
      activityDays = JSON.parse(activityDaysJson);
      if (!Array.isArray(activityDays)) {
        activityDays = [];
      }
    } catch {
      activityDays = [];
    }
  }

  // 모집 포지션 파싱
  let recruitingPositions: { FW?: number; MF?: number; DF?: number; GK?: number } | null = null;
  if (recruitingPositionsJson) {
    try {
      recruitingPositions = JSON.parse(recruitingPositionsJson);
    } catch {
      recruitingPositions = null;
    }
  }

  let emblemUrl: string | undefined = undefined;

  if (emblemFile && emblemFile.size > 0) {
    // 파일 크기 검증 (5MB)
    if (emblemFile.size > 5 * 1024 * 1024) {
      throw new Error("파일 크기는 5MB를 초과할 수 없습니다");
    }

    // 파일 타입 검증
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(emblemFile.type)) {
      throw new Error("지원되지 않는 이미지 형식입니다 (JPG, PNG, WebP, SVG만 가능)");
    }

    // 기존 엠블럼 삭제 (선택사항)
    const { data: currentTeam } = await supabase
      .from("teams")
      .select("emblem_url")
      .eq("id", teamId)
      .single();

    if (currentTeam?.emblem_url) {
      const url = new URL(currentTeam.emblem_url);
      const pathParts = url.pathname.split("/");
      const bucketIndex = pathParts.indexOf("team-emblems");
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        const filePath = pathParts.slice(bucketIndex + 1).join("/");
        await supabase.storage.from("team-emblems").remove([filePath]);
      }
    }

    // 파일명 생성
    const fileExt = emblemFile.name.split(".").pop();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const fileName = `${timestamp}_${randomStr}.${fileExt}`;
    const path = `${user.id}/${fileName}`;

    // 파일 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("team-emblems")
      .upload(path, emblemFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`이미지 업로드 실패: ${uploadError.message}`);
    }

    // Public URL 생성
    const {
      data: { publicUrl },
    } = supabase.storage.from("team-emblems").getPublicUrl(uploadData.path);

    emblemUrl = publicUrl;
  }

  // 팀 정보 업데이트
  const updateData: any = {
    name,
    region: region || null,
    hashtags,
    description: description || null,
    activity_days: activityDays,
    is_recruiting: isRecruiting,
    recruiting_positions: recruitingPositions,
    level: Math.max(1, Math.min(10, level)),
  };

  if (emblemUrl !== undefined) {
    updateData.emblem_url = emblemUrl;
  }

  const { error } = await supabase
    .from("teams")
    .update(updateData)
    .eq("id", teamId);

  if (error) throw error;

  revalidatePath(`/teams/${teamId}`);
  revalidatePath(`/teams/${teamId}/settings`);
  revalidatePath("/teams");
  revalidatePath("/dashboard");
}

export async function requestJoinTeam(teamId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("로그인이 필요합니다");

  // 기존 멤버십 확인 (탈퇴한 상태 포함)
  const { data: existing } = await supabase
    .from("team_members")
    .select("id, status")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    // 이전에 탈퇴한 멤버인 경우 재가입 처리
    if (existing.status === "left") {
      const { error } = await supabase
        .from("team_members")
        .update({
          status: "pending" as const,
          left_at: null,
        })
        .eq("id", existing.id);

      if (error) throw error;
      revalidatePath(`/teams/${teamId}`);
      return;
    }
    // 이미 활성 상태거나 대기 중인 경우
    throw new Error("이미 가입 신청하셨습니다");
  }

  // 새로운 멤버 생성
  const { error } = await supabase.from("team_members").insert({
    team_id: teamId,
    user_id: user.id,
    role: "MEMBER" as const,
    status: "pending" as const,
  });

  if (error) throw error;

  revalidatePath(`/teams/${teamId}`);
}

export async function approveMember(memberId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("team_members")
    .update({ status: "active" as const })
    .eq("id", memberId);

  if (error) throw error;

  revalidatePath("/teams");
}

export async function rejectMember(memberId: string): Promise<void> {
  const supabase = await createClient();

  // pending 상태의 가입 신청만 삭제 (기록이 없는 경우)
  // 이미 active였다가 재가입 신청한 경우는 소프트 딜리트 유지
  const { data: member } = await supabase
    .from("team_members")
    .select("status, left_at")
    .eq("id", memberId)
    .single();

  if (member?.left_at) {
    // 이전 기록이 있는 경우 (재가입 신청 거절) - 다시 left 상태로 복원
    const { error } = await supabase
      .from("team_members")
      .update({
        status: "left" as const,
        left_at: member.left_at, // 기존 탈퇴 시간 유지
      })
      .eq("id", memberId);

    if (error) throw error;
  } else {
    // 새로운 가입 신청 거절 - 하드 딜리트
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", memberId)
      .eq("status", "pending");

    if (error) throw error;
  }

  revalidatePath("/teams");
}

export async function addGuestMember(
  teamId: string,
  guestName: string,
  backNumber?: number
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("team_members").insert({
    team_id: teamId,
    is_guest: true,
    guest_name: guestName,
    back_number: backNumber || null,
    role: "MEMBER" as const,
    status: "active" as const,
  });

  if (error) throw error;

  revalidatePath(`/teams/${teamId}`);
}

export async function updateMemberRole(
  memberId: string,
  role: "MANAGER" | "MEMBER"
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("team_members")
    .update({ role })
    .eq("id", memberId);

  if (error) throw error;

  revalidatePath("/teams");
}

export async function removeMember(memberId: string): Promise<void> {
  const supabase = await createClient();

  // 소프트 딜리트: status를 'left'로 변경하고 left_at에 현재 시간 기록
  // 이렇게 하면 match_records와의 FK 관계가 유지되어 기록이 보존됨
  const { error } = await supabase
    .from("team_members")
    .update({
      status: "left" as const,
      left_at: new Date().toISOString(),
    })
    .eq("id", memberId);

  if (error) throw error;

  revalidatePath("/teams");
  revalidatePath("/dashboard");
}

export async function updateMemberInfo(
  memberId: string,
  data: {
    team_positions?: string[];
    back_number?: number | null;
  }
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("로그인이 필요합니다");

  // 멤버 정보와 팀 정보 조회
  const { data: member, error: memberError } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("id", memberId)
    .single();

  if (memberError || !member) throw new Error("멤버를 찾을 수 없습니다");

  // 권한 확인 (OWNER 또는 MANAGER만 수정 가능)
  const { data: currentUserMembership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", member.team_id)
    .eq("user_id", user.id)
    .single();

  if (
    !currentUserMembership ||
    (currentUserMembership.role !== "OWNER" &&
      currentUserMembership.role !== "MANAGER")
  ) {
    throw new Error("권한이 없습니다");
  }

  // 등번호 중복 체크 (같은 팀 내에서 동일한 등번호가 있는지 확인)
  if (data.back_number !== undefined && data.back_number !== null) {
    const { data: existingMember } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", member.team_id)
      .eq("back_number", data.back_number)
      .neq("id", memberId)
      .eq("status", "active")
      .single();

    if (existingMember) {
      throw new Error(`등번호 ${data.back_number}번은 이미 다른 선수가 사용 중입니다`);
    }
  }

  const { error } = await supabase
    .from("team_members")
    .update(data)
    .eq("id", memberId);

  if (error) throw error;

  revalidatePath("/teams");
}
