import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret) {
      console.error("CRON_SECRET not configured");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase credentials not configured");
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("teams")
      .select("id, name")
      .limit(1)
      .single();

    const timestamp = new Date().toISOString();
    const kstTime = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

    if (error && error.code !== "PGRST116") {
      console.error("Keep-alive query failed:", error);
      
      await supabase.from("cron_logs").insert({
        job_name: "keep-alive",
        status: "error",
        message: error.message,
        details: { error: error.message, kstTime },
      });
      
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const teamName = data?.name || "no teams";
    console.log(`Keep-alive: pinged at ${timestamp}, team: ${teamName}`);

    await supabase.from("cron_logs").insert({
      job_name: "keep-alive",
      status: "success",
      message: `Database alive - ${teamName}`,
      details: { teamId: data?.id, teamName, kstTime },
    });
    
    return NextResponse.json({ 
      success: true, 
      timestamp,
      kstTime,
      teamName,
    });
  } catch (err) {
    console.error("Keep-alive unexpected error:", err);
    return NextResponse.json({ 
      error: "Unexpected error", 
      message: err instanceof Error ? err.message : "Unknown error" 
    }, { status: 500 });
  }
}
