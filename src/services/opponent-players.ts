"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { OpponentPlayer } from "@/types/supabase";

/**
 * 경기의 상대팀 선수 목록 가져오기
 */
export async function getOpponentPlayers(
  matchId: string
): Promise<OpponentPlayer[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opponent_players")
    .select("*")
    .eq("match_id", matchId)
    .order("number", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data as OpponentPlayer[];
}

/**
 * 상대팀 선수 추가 (자동으로 라인업에 추가)
 */
export async function addOpponentPlayer(
  matchId: string,
  name: string,
  number?: number | null,
  position?: "FW" | "MF" | "DF" | "GK" | null
): Promise<OpponentPlayer> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opponent_players")
    .insert({
      match_id: matchId,
      name,
      number,
      position,
      is_playing: true, // 자동으로 라인업에 추가
    })
    .select()
    .single();

  if (error) throw error;

  revalidatePath(`/matches/${matchId}`);
  return data as OpponentPlayer;
}

/**
 * 상대팀 선수 수정
 */
export async function updateOpponentPlayer(
  playerId: string,
  matchId: string,
  updates: {
    name?: string;
    number?: number | null;
    position?: "FW" | "MF" | "DF" | "GK" | null;
    is_playing?: boolean;
  }
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("opponent_players")
    .update(updates)
    .eq("id", playerId);

  if (error) throw error;

  revalidatePath(`/matches/${matchId}`);
}

/**
 * 상대팀 선수 삭제
 */
export async function deleteOpponentPlayer(
  playerId: string,
  matchId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("opponent_players")
    .delete()
    .eq("id", playerId);

  if (error) throw error;

  revalidatePath(`/matches/${matchId}`);
}

/**
 * 상대팀 라인업 일괄 저장 (is_playing 업데이트)
 */
export async function saveOpponentLineup(
  matchId: string,
  playingPlayerIds: string[]
): Promise<void> {
  const supabase = await createClient();

  // 모든 선수를 is_playing = false로 설정
  const { error: resetError } = await supabase
    .from("opponent_players")
    .update({ is_playing: false })
    .eq("match_id", matchId);

  if (resetError) throw resetError;

  // 선택된 선수만 is_playing = true로 설정
  if (playingPlayerIds.length > 0) {
    const { error: updateError } = await supabase
      .from("opponent_players")
      .update({ is_playing: true })
      .in("id", playingPlayerIds);

    if (updateError) throw updateError;
  }

  revalidatePath(`/matches/${matchId}`);
}
