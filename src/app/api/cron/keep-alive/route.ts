import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

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
    
    await supabase.from("cron_logs").insert({
      job_name: "keep-alive",
      status: "error",
      message: error.message,
      details: { error: error.message },
    });
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const timestamp = new Date().toISOString();
  const kstTime = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  
  console.log(`Keep-alive: ${count} teams found at ${timestamp}`);

  await supabase.from("cron_logs").insert({
    job_name: "keep-alive",
    status: "success",
    message: `${count} teams found`,
    details: { teamsCount: count, kstTime },
  });
  
  return NextResponse.json({ 
    success: true, 
    timestamp,
    kstTime,
    teamsCount: count,
  });
}
