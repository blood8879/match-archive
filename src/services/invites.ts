"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TeamInvite, User } from "@/types/supabase";

export type TeamInviteWithUsers = TeamInvite & {
  team: {
    id: string;
    name: string;
    emblem_url: string | null;
  };
  inviter: Pick<User, "id" | "nickname" | "avatar_url">;
  invitee: Pick<User, "id" | "nickname" | "avatar_url">;
};

/**
 * 유저 코드로 사용자 찾기
 */
export async function getUserByCode(userCode: string): Promise<User | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("user_code", userCode.toUpperCase())
    .single();

  if (error) {
    console.error("[getUserByCode] Error:", error.message);
    return null;
  }

  return data as User;
}

/**
 * 현재 로그인한 사용자의 유저 코드 가져오기
 */
export async function getMyUserCode(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("user_code")
    .eq("id", user.id)
    .single();

  return data?.user_code || null;
}

/**
 * 팀 초대 요청 생성
 */
export async function createTeamInvite(
  teamId: string,
  userCode: string
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("로그인이 필요합니다");

  // 유저 코드로 초대할 사용자 찾기
  const invitee = await getUserByCode(userCode);
  if (!invitee) {
    throw new Error("존재하지 않는 유저 코드입니다");
  }

  // 자기 자신을 초대할 수 없음
  if (invitee.id === user.id) {
    throw new Error("자기 자신을 초대할 수 없습니다");
  }

  // 이미 팀 멤버인지 확인
  const { data: existingMember } = await supabase
    .from("team_members")
    .select("id, status")
    .eq("team_id", teamId)
    .eq("user_id", invitee.id)
    .maybeSingle();

  if (existingMember) {
    if (existingMember.status === "active") {
      throw new Error("이미 팀에 가입된 사용자입니다");
    } else {
      throw new Error("이미 가입 신청한 사용자입니다");
    }
  }

  // 이미 초대했는지 확인
  const inviteResult = await supabase
    .from("team_invites")
    .select("*")
    .eq("team_id", teamId)
    .eq("invitee_id", invitee.id);

  const existingInvites = inviteResult.data;

  if (existingInvites && existingInvites.length > 0) {
    const existingInvite: any = existingInvites[0];
    if (existingInvite.status === "pending") {
      throw new Error("이미 초대 요청을 보냈습니다");
    } else if (existingInvite.status === "rejected") {
      // 거절된 초대는 다시 보낼 수 있음 - 기존 초대 삭제
      await supabase
        .from("team_invites")
        .delete()
        .eq("id", existingInvite.id);
    }
  }

  // 초대 생성
  const { error } = await supabase.from("team_invites").insert({
    team_id: teamId,
    inviter_id: user.id,
    invitee_id: invitee.id,
    status: "pending" as const,
  } as any);

  if (error) {
    console.error("[createTeamInvite] Error:", error.message);
    throw new Error("초대 요청 전송에 실패했습니다");
  }

  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/dashboard");
}

/**
 * 받은 팀 초대 목록 가져오기
 */
export async function getMyInvites(): Promise<TeamInviteWithUsers[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("로그인이 필요합니다");

  const { data, error } = await supabase
    .from("team_invites")
    .select(
      `
      *,
      team:teams(id, name, emblem_url),
      inviter:users!team_invites_inviter_id_fkey(id, nickname, avatar_url),
      invitee:users!team_invites_invitee_id_fkey(id, nickname, avatar_url)
    `
    )
    .eq("invitee_id", user.id)
    .eq("status", "pending" as any)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getMyInvites] Error:", error.message);
    throw error;
  }

  return data as unknown as TeamInviteWithUsers[];
}

/**
 * 팀이 보낸 초대 목록 가져오기
 */
export async function getTeamInvites(
  teamId: string
): Promise<TeamInviteWithUsers[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("team_invites")
    .select(
      `
      *,
      team:teams(id, name, emblem_url),
      inviter:users!team_invites_inviter_id_fkey(id, nickname, avatar_url),
      invitee:users!team_invites_invitee_id_fkey(id, nickname, avatar_url)
    `
    )
    .eq("team_id", teamId)
    .eq("status", "pending" as any)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getTeamInvites] Error:", error.message);
    throw error;
  }

  return data as unknown as TeamInviteWithUsers[];
}

/**
 * 팀 초대 수락
 */
export async function acceptTeamInvite(inviteId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("로그인이 필요합니다");

  // 초대 정보 가져오기
  const inviteResult = await supabase
    .from("team_invites")
    .select("*")
    .eq("id", inviteId)
    .eq("invitee_id", user.id)
    .eq("status", "pending" as any)
    .single();

  const invite: any = inviteResult.data;
  const inviteError = inviteResult.error;

  if (inviteError || !invite) {
    throw new Error("유효하지 않은 초대입니다");
  }

  // 트랜잭션처럼 처리: 팀 멤버 추가 후 초대 상태 업데이트
  const { error: memberError } = await supabase.from("team_members").insert({
    team_id: invite.team_id,
    user_id: user.id,
    role: "MEMBER",
    status: "active",
  });

  if (memberError) {
    console.error("[acceptTeamInvite] Member insert error:", memberError.message);
    throw new Error("팀 가입에 실패했습니다");
  }

  // 초대 상태를 accepted로 변경
  const { error: updateError } = await supabase
    .from("team_invites")
    .update({ status: "accepted" as any } as any)
    .eq("id", inviteId);

  if (updateError) {
    console.error("[acceptTeamInvite] Update error:", updateError.message);
    // 이미 팀 멤버는 추가되었으므로 에러를 throw하지 않음
  }

  revalidatePath("/dashboard");
  revalidatePath(`/teams/${invite.team_id}`);
}

/**
 * 팀 초대 거절
 */
export async function rejectTeamInvite(inviteId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("로그인이 필요합니다");

  const { error } = await supabase
    .from("team_invites")
    .update({ status: "rejected" as any } as any)
    .eq("id", inviteId)
    .eq("invitee_id", user.id);

  if (error) {
    console.error("[rejectTeamInvite] Error:", error.message);
    throw new Error("초대 거절에 실패했습니다");
  }

  revalidatePath("/dashboard");
}

/**
 * 팀 초대 취소 (팀 관리자가 보낸 초대 취소)
 */
export async function cancelTeamInvite(inviteId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("team_invites")
    .delete()
    .eq("id", inviteId);

  if (error) {
    console.error("[cancelTeamInvite] Error:", error.message);
    throw new Error("초대 취소에 실패했습니다");
  }

  revalidatePath("/teams");
}
