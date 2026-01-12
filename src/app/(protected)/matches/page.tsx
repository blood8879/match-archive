import { createClient } from "@/lib/supabase/server";
import type { Match, Team, TeamMember } from "@/types/supabase";
import { MatchListClient } from "./match-list-client";

type MatchWithTeam = Match & {
  team: Team | null;
  opponent_team: { id: string; name: string; emblem_url: string | null } | null;
  venue: { id: string; name: string; address: string } | null;
};
type TeamMemberWithTeam = TeamMember & { team: Team | null };

export default async function MatchesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: myTeamsRaw } = await supabase
    .from("team_members")
    .select("*, team:teams(*)")
    .eq("user_id", user.id)
    .eq("status", "active");

  const myTeams = myTeamsRaw as TeamMemberWithTeam[] | null;
  const teamIds = myTeams?.map((t) => t.team_id) ?? [];

  // 팀 정보 추출
  const teams = (myTeams ?? [])
    .filter((t) => t.team !== null)
    .map((t) => ({
      id: t.team!.id,
      name: t.team!.name,
      emblem_url: t.team!.emblem_url,
    }));

  let matches: MatchWithTeam[] = [];

  if (teamIds.length > 0) {
    const { data: matchesRaw } = await supabase
      .from("matches")
      .select(
        "*, team:teams!matches_team_id_fkey(*), opponent_team:teams!matches_opponent_team_id_fkey(id, name, emblem_url), venue:venues(id, name, address)"
      )
      .in("team_id", teamIds)
      .order("match_date", { ascending: false });

    matches = (matchesRaw as MatchWithTeam[]) ?? [];
  }

  return <MatchListClient matches={matches} teams={teams} />;
}
