"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return document.cookie
            .split("; ")
            .filter((cookie) => cookie)
            .map((cookie) => {
              const [name, ...rest] = cookie.split("=");
              return { name, value: rest.join("=") };
            });
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // 쿠키 만료 시간을 명시적으로 설정 (7일)
            const maxAge = options?.maxAge ?? 60 * 60 * 24 * 7; // 7 days
            const expires = new Date(Date.now() + maxAge * 1000);

            document.cookie = `${name}=${value}; path=/; expires=${expires.toUTCString()}; SameSite=Lax${
              options?.secure ? "; Secure" : ""
            }`;
          });
        },
      },
    }
  );
}
