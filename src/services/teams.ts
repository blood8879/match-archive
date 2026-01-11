"use server";

import { createClient } from "@/lib/supabase/server";
import { generateInviteCode } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import type { Team, TeamMember, User } from "@/types/supabase";

export type TeamMemberWithUser = TeamMember & {
  user: Pick<User, "id" | "nickname" | "avatar_url" | "position"> | null;
};

export async function getTeams(region?: string, query?: string): Promise<Team[]> {
  const supabase = await createClient();

  let q = supabase
    .from("teams")
    .select("*")
    .order("created_at", { ascending: false });

  if (region) {
    q = q.eq("region", region);
  }

  if (query) {
    q = q.ilike("name", `%${query}%`);
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

  if (!name) throw new Error("팀 이름은 필수입니다");

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

  const { data: existing } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  if (existing) throw new Error("이미 가입 신청하셨습니다");

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

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", memberId);

  if (error) throw error;

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

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", memberId);

  if (error) throw error;

  revalidatePath("/teams");
}
