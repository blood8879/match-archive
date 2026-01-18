"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type GuestTeam = {
  id: string;
  team_id: string;
  name: string;
  region: string | null;
  emblem_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Get all guest teams for a specific team
 * @param teamId - The team ID
 * @returns Array of guest teams
 */
export async function getGuestTeams(teamId: string): Promise<GuestTeam[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("guest_teams")
    .select("*")
    .eq("team_id", teamId)
    .order("name", { ascending: true });

  if (error) {
    console.error("[getGuestTeams] Error:", error);
    throw error;
  }

  return data as GuestTeam[];
}

/**
 * Get a specific guest team by ID
 * @param id - The guest team ID
 * @returns Guest team data or null
 */
export async function getGuestTeamById(id: string): Promise<GuestTeam | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("guest_teams")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[getGuestTeamById] Error:", error);
    return null;
  }

  return data as GuestTeam;
}

export type CreateGuestTeamResult = 
  | { success: true; data: GuestTeam }
  | { success: false; error: string };

export async function createGuestTeam(
  teamId: string,
  formData: FormData
): Promise<CreateGuestTeamResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "로그인이 필요합니다" };

  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  if (
    !membership ||
    (membership.role !== "OWNER" && membership.role !== "MANAGER")
  ) {
    return { success: false, error: "권한이 없습니다" };
  }

  const name = formData.get("name") as string;
  const region = formData.get("region") as string;
  const notes = formData.get("notes") as string;
  const emblemFile = formData.get("emblem") as File | null;

  if (!name) return { success: false, error: "팀 이름은 필수입니다" };

  const { data: existing } = await supabase
    .from("guest_teams")
    .select("id")
    .eq("team_id", teamId)
    .eq("name", name)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "이미 존재하는 게스트팀 이름입니다" };
  }

  let emblemUrl: string | null = null;

  if (emblemFile && emblemFile.size > 0) {
    if (emblemFile.size > 5 * 1024 * 1024) {
      return { success: false, error: "파일 크기는 5MB를 초과할 수 없습니다" };
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
    ];
    if (!allowedTypes.includes(emblemFile.type)) {
      return { success: false, error: "지원되지 않는 이미지 형식입니다 (JPG, PNG, WebP, SVG만 가능)" };
    }

    const fileExt = emblemFile.name.split(".").pop();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const fileName = `${timestamp}_${randomStr}.${fileExt}`;
    const path = `${teamId}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("team-emblems")
      .upload(path, emblemFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: `이미지 업로드 실패: ${uploadError.message}` };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("team-emblems").getPublicUrl(uploadData.path);

    emblemUrl = publicUrl;
  }

  const { data, error } = await supabase
    .from("guest_teams")
    .insert({
      team_id: teamId,
      name,
      region: region || null,
      emblem_url: emblemUrl,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[createGuestTeam] Error:", error);
    if (error.code === "23505" || error.message?.includes("unique")) {
      return { success: false, error: "이미 존재하는 게스트팀 이름입니다" };
    }
    return { success: false, error: "게스트팀 생성에 실패했습니다" };
  }

  revalidatePath(`/teams/${teamId}`);
  revalidatePath(`/teams/${teamId}/matches/new`);

  return { success: true, data: data as GuestTeam };
}

/**
 * Update a guest team
 * @param guestTeamId - The guest team ID
 * @param formData - Form data containing updated fields
 */
export async function updateGuestTeam(
  guestTeamId: string,
  formData: FormData
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("로그인이 필요합니다");

  // Get guest team to check permission
  const { data: guestTeam } = await supabase
    .from("guest_teams")
    .select("team_id, emblem_url")
    .eq("id", guestTeamId)
    .single();

  if (!guestTeam) throw new Error("게스트팀을 찾을 수 없습니다");

  // Check permission
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", guestTeam.team_id)
    .eq("user_id", user.id)
    .single();

  if (
    !membership ||
    (membership.role !== "OWNER" && membership.role !== "MANAGER")
  ) {
    throw new Error("권한이 없습니다");
  }

  const name = formData.get("name") as string;
  const region = formData.get("region") as string;
  const notes = formData.get("notes") as string;
  const emblemFile = formData.get("emblem") as File | null;

  if (!name) throw new Error("팀 이름은 필수입니다");

  let emblemUrl: string | undefined = undefined;

  if (emblemFile && emblemFile.size > 0) {
    // File validation
    if (emblemFile.size > 5 * 1024 * 1024) {
      throw new Error("파일 크기는 5MB를 초과할 수 없습니다");
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
    ];
    if (!allowedTypes.includes(emblemFile.type)) {
      throw new Error(
        "지원되지 않는 이미지 형식입니다 (JPG, PNG, WebP, SVG만 가능)"
      );
    }

    // Delete old emblem if exists
    if (guestTeam.emblem_url) {
      const url = new URL(guestTeam.emblem_url);
      const pathParts = url.pathname.split("/");
      const bucketIndex = pathParts.indexOf("team-emblems");
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        const filePath = pathParts.slice(bucketIndex + 1).join("/");
        await supabase.storage.from("team-emblems").remove([filePath]);
      }
    }

    // Upload new emblem
    const fileExt = emblemFile.name.split(".").pop();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const fileName = `${timestamp}_${randomStr}.${fileExt}`;
    const path = `${guestTeam.team_id}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("team-emblems")
      .upload(path, emblemFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`이미지 업로드 실패: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("team-emblems").getPublicUrl(uploadData.path);

    emblemUrl = publicUrl;
  }

  const updateData: any = {
    name,
    region: region || null,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  };

  if (emblemUrl !== undefined) {
    updateData.emblem_url = emblemUrl;
  }

  const { error } = await supabase
    .from("guest_teams")
    .update(updateData)
    .eq("id", guestTeamId);

  if (error) throw error;

  revalidatePath(`/teams/${guestTeam.team_id}`);
  revalidatePath(`/teams/${guestTeam.team_id}/matches/new`);
}

/**
 * Delete a guest team
 * @param guestTeamId - The guest team ID
 */
export async function deleteGuestTeam(guestTeamId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("로그인이 필요합니다");

  // Get guest team to check permission and delete emblem
  const { data: guestTeam } = await supabase
    .from("guest_teams")
    .select("team_id, emblem_url")
    .eq("id", guestTeamId)
    .single();

  if (!guestTeam) throw new Error("게스트팀을 찾을 수 없습니다");

  // Check permission
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", guestTeam.team_id)
    .eq("user_id", user.id)
    .single();

  if (
    !membership ||
    (membership.role !== "OWNER" && membership.role !== "MANAGER")
  ) {
    throw new Error("권한이 없습니다");
  }

  // Delete emblem if exists
  if (guestTeam.emblem_url) {
    const url = new URL(guestTeam.emblem_url);
    const pathParts = url.pathname.split("/");
    const bucketIndex = pathParts.indexOf("team-emblems");
    if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
      const filePath = pathParts.slice(bucketIndex + 1).join("/");
      await supabase.storage.from("team-emblems").remove([filePath]);
    }
  }

  const { error } = await supabase
    .from("guest_teams")
    .delete()
    .eq("id", guestTeamId);

  if (error) throw error;

  revalidatePath(`/teams/${guestTeam.team_id}`);
  revalidatePath(`/teams/${guestTeam.team_id}/matches/new`);
}
