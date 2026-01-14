"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateUserProfile(data: {
  nickname: string;
  phone?: string;
  preferred_position?: string;
  bio?: string;
  is_public?: boolean;
  email_notifications?: boolean;
  nationality?: string | null;
  birth_date?: string | null;
  preferred_foot?: "left" | "right" | "both" | null;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("인증되지 않은 사용자입니다");
  }

  const { error } = await supabase
    .from("users")
    .update({
      nickname: data.nickname,
      phone: data.phone || null,
      preferred_position: data.preferred_position || null,
      bio: data.bio || null,
      is_public: data.is_public ?? true,
      email_notifications: data.email_notifications ?? false,
      nationality: data.nationality || null,
      birth_date: data.birth_date || null,
      preferred_foot: data.preferred_foot || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("Failed to update user profile:", error);
    throw error;
  }

  revalidatePath("/settings");
  revalidatePath("/profile");
}

export async function signOut() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Failed to sign out:", error);
    throw error;
  }

  redirect("/login");
}

export async function uploadAvatar(file: File) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("인증되지 않은 사용자입니다");
  }

  // 파일 확장자 확인
  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;

  // 기존 아바타 삭제 (있다면)
  const { data: currentUser } = await supabase
    .from("users")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  if (currentUser?.avatar_url) {
    // URL에서 경로 추출
    const url = new URL(currentUser.avatar_url);
    const pathParts = url.pathname.split("/");
    const bucketIndex = pathParts.indexOf("avatars");
    if (bucketIndex !== -1) {
      const filePath = pathParts.slice(bucketIndex + 1).join("/");
      await supabase.storage.from("avatars").remove([filePath]);
    }
  }

  // 새 아바타 업로드
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Failed to upload avatar:", uploadError);
    throw uploadError;
  }

  // 공개 URL 가져오기
  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(fileName);

  // users 테이블 업데이트
  const { error: updateError } = await supabase
    .from("users")
    .update({
      avatar_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("Failed to update avatar URL:", updateError);
    throw updateError;
  }

  revalidatePath("/settings");
  revalidatePath("/profile");
}

export async function deleteAvatar() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("인증되지 않은 사용자입니다");
  }

  // 기존 아바타 정보 가져오기
  const { data: currentUser } = await supabase
    .from("users")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  if (currentUser?.avatar_url) {
    // URL에서 경로 추출
    const url = new URL(currentUser.avatar_url);
    const pathParts = url.pathname.split("/");
    const bucketIndex = pathParts.indexOf("avatars");
    if (bucketIndex !== -1) {
      const filePath = pathParts.slice(bucketIndex + 1).join("/");
      await supabase.storage.from("avatars").remove([filePath]);
    }
  }

  // users 테이블 업데이트
  const { error: updateError } = await supabase
    .from("users")
    .update({
      avatar_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("Failed to delete avatar:", updateError);
    throw updateError;
  }

  revalidatePath("/settings");
  revalidatePath("/profile");
}
