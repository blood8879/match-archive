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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`Keep-alive: ${count} teams found at ${new Date().toISOString()}`);
  
  return NextResponse.json({ 
    success: true, 
    timestamp: new Date().toISOString(),
    teamsCount: count 
  });
}
