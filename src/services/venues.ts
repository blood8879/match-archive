"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Venue } from "@/types/supabase";

export async function getTeamVenues(teamId: string): Promise<Venue[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .eq("team_id", teamId)
    .is("deleted_at", null)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getTeamVenues] Error:", error);
    throw error;
  }

  return data as Venue[];
}

export async function getVenueById(id: string): Promise<Venue | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[getVenueById] Error:", error);
    throw error;
  }

  return data as Venue;
}

export async function createVenue(formData: FormData): Promise<Venue> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("로그인이 필요합니다");

  const teamId = formData.get("team_id") as string;
  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const addressDetail = formData.get("address_detail") as string | null;
  const postalCode = formData.get("postal_code") as string | null;
  const isPrimary = formData.get("is_primary") === "true";

  const { data: venue, error } = await supabase
    .from("venues")
    .insert({
      team_id: teamId,
      name,
      address,
      address_detail: addressDetail,
      postal_code: postalCode,
      is_primary: isPrimary,
    })
    .select()
    .single();

  if (error) {
    console.error("[createVenue] Error:", error);
    throw new Error("경기장 등록에 실패했습니다");
  }

  revalidatePath(`/teams/${teamId}`);
  revalidatePath(`/teams/${teamId}/venues`);

  return venue as Venue;
}

export async function updateVenue(
  id: string,
  formData: FormData
): Promise<Venue> {
  const supabase = await createClient();

  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const addressDetail = formData.get("address_detail") as string | null;
  const postalCode = formData.get("postal_code") as string | null;
  const isPrimary = formData.get("is_primary") === "true";

  const { data: venue, error } = await supabase
    .from("venues")
    .update({
      name,
      address,
      address_detail: addressDetail,
      postal_code: postalCode,
      is_primary: isPrimary,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[updateVenue] Error:", error);
    throw new Error("경기장 수정에 실패했습니다");
  }

  const teamId = venue.team_id;
  revalidatePath(`/teams/${teamId}`);
  revalidatePath(`/teams/${teamId}/venues`);

  return venue as Venue;
}

export async function deleteVenue(id: string): Promise<void> {
  const supabase = await createClient();

  // Get venue info before soft deleting
  const { data: venue } = await supabase
    .from("venues")
    .select("team_id, is_primary")
    .eq("id", id)
    .single();

  if (!venue) {
    throw new Error("경기장을 찾을 수 없습니다");
  }

  // If primary venue, set is_primary to false first
  if (venue.is_primary) {
    const { error: updateError } = await supabase
      .from("venues")
      .update({ is_primary: false })
      .eq("id", id);

    if (updateError) {
      console.error("[deleteVenue] Error updating is_primary:", updateError);
      throw new Error("기본 경기장 설정 해제에 실패했습니다");
    }
  }

  // Soft delete: set deleted_at timestamp
  const { error } = await supabase
    .from("venues")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[deleteVenue] Error:", error);
    throw new Error("경기장 삭제에 실패했습니다");
  }

  revalidatePath(`/teams/${venue.team_id}`);
  revalidatePath(`/teams/${venue.team_id}/venues`);
}

export async function setPrimaryVenue(
  venueId: string,
  teamId: string
): Promise<void> {
  const supabase = await createClient();

  // Check if venue exists and is not deleted
  const { data: venue } = await supabase
    .from("venues")
    .select("id")
    .eq("id", venueId)
    .is("deleted_at", null)
    .single();

  if (!venue) {
    throw new Error("경기장을 찾을 수 없거나 삭제된 경기장입니다");
  }

  const { error } = await supabase
    .from("venues")
    .update({ is_primary: true })
    .eq("id", venueId);

  if (error) {
    console.error("[setPrimaryVenue] Error:", error);
    throw new Error("기본 경기장 설정에 실패했습니다");
  }

  revalidatePath(`/teams/${teamId}`);
  revalidatePath(`/teams/${teamId}/venues`);
}

export async function getVenueByIdIncludingDeleted(
  id: string
): Promise<Venue | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[getVenueByIdIncludingDeleted] Error:", error);
    throw error;
  }

  return data as Venue;
}
