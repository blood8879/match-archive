import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "blood8879@gmail.com";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { count, error } = await supabase
    .from("teams")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Keep-alive query failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const timestamp = new Date().toISOString();
  const kstTime = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  
  console.log(`Keep-alive: ${count} teams found at ${timestamp}`);

  let emailSent = false;
  let emailError: string | null = null;

  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      await resend.emails.send({
        from: "Match Archive <onboarding@resend.dev>",
        to: ADMIN_EMAIL,
        subject: `[Match Archive] Cron 실행 완료 - ${kstTime}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #00e677;">Match Archive Cron 실행 완료</h2>
            <p><strong>실행 시간:</strong> ${kstTime} (KST)</p>
            <p><strong>UTC 시간:</strong> ${timestamp}</p>
            <p><strong>등록된 팀 수:</strong> ${count}개</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #666; font-size: 12px;">
              이 이메일은 Vercel Cron Job에서 자동으로 발송되었습니다.
            </p>
          </div>
        `,
      });
      
      emailSent = true;
      console.log(`Email notification sent to ${ADMIN_EMAIL}`);
    } catch (err) {
      emailError = err instanceof Error ? err.message : "Unknown error";
      console.error("Failed to send email:", emailError);
    }
  } else {
    console.log("RESEND_API_KEY not configured, skipping email notification");
  }
  
  return NextResponse.json({ 
    success: true, 
    timestamp,
    kstTime,
    teamsCount: count,
    emailSent,
    emailError,
  });
}
