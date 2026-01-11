import { createClient } from "@/lib/supabase/client";

export type UploadImageOptions = {
  bucket: "team-emblems" | "user-avatars";
  file: File;
  userId: string;
  folder?: string;
};

/**
 * 이미지를 Supabase Storage에 업로드합니다.
 * @returns 업로드된 이미지의 public URL
 */
export async function uploadImage({
  bucket,
  file,
  userId,
  folder,
}: UploadImageOptions): Promise<string> {
  const supabase = createClient();

  // 파일 크기 검증 (5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("파일 크기는 5MB를 초과할 수 없습니다");
  }

  // 파일 타입 검증
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (bucket === "team-emblems") {
    allowedTypes.push("image/svg+xml");
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error("지원되지 않는 이미지 형식입니다");
  }

  // 파일명 생성 (타임스탬프 + 랜덤 문자열)
  const fileExt = file.name.split(".").pop();
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  const fileName = `${timestamp}_${randomStr}.${fileExt}`;

  // 저장 경로 생성
  const path = folder ? `${userId}/${folder}/${fileName}` : `${userId}/${fileName}`;

  // 파일 업로드
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`이미지 업로드 실패: ${error.message}`);
  }

  // Public URL 생성
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return publicUrl;
}

/**
 * Supabase Storage에서 이미지를 삭제합니다.
 */
export async function deleteImage(bucket: string, path: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw new Error(`이미지 삭제 실패: ${error.message}`);
  }
}

/**
 * 기존 이미지를 삭제하고 새 이미지를 업로드합니다.
 */
export async function replaceImage(
  oldImageUrl: string | null,
  options: UploadImageOptions
): Promise<string> {
  // 새 이미지 업로드
  const newUrl = await uploadImage(options);

  // 기존 이미지가 있으면 삭제
  if (oldImageUrl) {
    try {
      const urlParts = new URL(oldImageUrl);
      const pathParts = urlParts.pathname.split("/");
      const bucketIndex = pathParts.findIndex((p) => p === "storage");
      if (bucketIndex !== -1) {
        const bucket = pathParts[bucketIndex + 2];
        const path = pathParts.slice(bucketIndex + 3).join("/");
        await deleteImage(bucket, path);
      }
    } catch (error) {
      console.error("기존 이미지 삭제 중 오류:", error);
      // 삭제 실패해도 새 이미지 URL은 반환
    }
  }

  return newUrl;
}
