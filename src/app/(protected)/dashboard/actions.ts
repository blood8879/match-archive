"use server";

import { getTeamDetailedStats, type TeamDetailedStats } from "@/services/team-stats";

export async function fetchTeamStatsBySeason(
  teamId: string,
  year: number
): Promise<TeamDetailedStats> {
  return getTeamDetailedStats(teamId, year);
}
