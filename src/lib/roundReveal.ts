import { createClient } from "@/lib/supabase/client";
import { TOTAL_ROUNDS } from "@/lib/constants";
import type { Room, Player } from "@/lib/database.types";

export async function wordExistsForRound(roomId: string, roundNumber: number): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("room_words")
    .select("id")
    .eq("room_id", roomId)
    .eq("round_number", roundNumber)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
}

export async function getWordForRound(roomId: string, roundNumber: number): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("room_words")
    .select("word_text")
    .eq("room_id", roomId)
    .eq("round_number", roundNumber)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.word_text ?? null;
}

// The word-giver (if any) never draws, so they don't count toward "everyone
// ready".
function activeDrawers(room: Room, players: Player[]): Player[] {
  if (room.word_giver_mode === "player" && room.word_giver_player_id) {
    return players.filter((p) => p.id !== room.word_giver_player_id);
  }
  return players;
}

function conditionMetFromPlayers(room: Room, players: Player[]): boolean {
  if (room.current_round === 0) return true; // first word: nothing to wait for
  if (room.phase_deadline && Date.now() >= new Date(room.phase_deadline).getTime()) return true;
  const drawers = activeDrawers(room, players);
  if (drawers.length === 0) return false;
  const readyCount = drawers.filter((p) => p.ready_for_round === room.current_round).length;
  return readyCount >= drawers.length;
}

// Sync version for UI display (e.g. "everyone's ready!" text, or choosing
// between the two waiting messages) — uses the `players` array a component
// already has from its realtime subscription, so this is free (no query).
export function isRevealConditionMetSync(room: Room, players: Player[]): boolean {
  return conditionMetFromPlayers(room, players);
}

// Attempts to advance the room from its current round to the next one, if
// the reveal condition is satisfied: the next word must actually exist
// (always true for computer/ahead-of-time modes; depends on the word-giver
// for round-by-round), and either the timer's up, every active drawer is
// ready, or it's the very first word. Fetches players fresh from the
// database itself (rather than trusting a caller-supplied array) so this is
// never racing a stale snapshot. Safe to call from any client, not just the
// host — this only ever writes the same idempotent target values, so a
// redundant duplicate write from two clients checking at once is harmless.
export async function tryAdvanceRound(room: Room): Promise<boolean> {
  if (room.current_round >= TOTAL_ROUNDS) return false;

  const nextRound = room.current_round + 1;
  const exists = await wordExistsForRound(room.id, nextRound);
  if (!exists) return false;

  const supabase = createClient();
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select()
    .eq("room_id", room.id);
  if (playersError) throw new Error(playersError.message);
  if (!conditionMetFromPlayers(room, (players ?? []) as Player[])) return false;

  const nextDeadline = new Date(Date.now() + room.draw_seconds * 1000).toISOString();
  const { error } = await supabase
    .from("rooms")
    .update({ current_round: nextRound, phase_deadline: nextDeadline })
    .eq("id", room.id);
  if (error) throw new Error(error.message);
  return true;
}

export async function markReady(playerId: string, roundNumber: number) {
  const supabase = createClient();
  const { error } = await supabase
    .from("players")
    .update({ ready_for_round: roundNumber })
    .eq("id", playerId);
  if (error) throw new Error(error.message);
}