import { NextResponse } from "next/server";
import { deleteMatch } from "@/services/matches";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: match } = await supabase
      .from("matches")
      .select("team_id")
      .eq("id", id)
      .single();

    if (!match) {
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404 }
      );
    }

    const { data: membership } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", match.team_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || (membership.role !== "OWNER" && membership.role !== "MANAGER")) {
      return NextResponse.json(
        { error: "Forbidden: You must be a team owner or manager" },
        { status: 403 }
      );
    }

    await deleteMatch(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete match:", error);
    return NextResponse.json(
      { error: "Failed to delete match" },
      { status: 500 }
    );
  }
}
