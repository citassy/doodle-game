import { createClient } from "@/lib/supabase/client";
import type { StrokePoint } from "@/lib/database.types";

export async function getMyDrawingCount(roomId: string, playerRowId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("drawings")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("player_id", playerRowId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getDrawing(
  roomId: string,
  playerRowId: string,
  roundNumber: number
): Promise<StrokePoint[][]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("drawings")
    .select("strokes")
    .eq("room_id", roomId)
    .eq("player_id", playerRowId)
    .eq("round_number", roundNumber)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.strokes as StrokePoint[][]) ?? [];
}

export async function saveDrawing(
  roomId: string,
  playerRowId: string,
  roundNumber: number,
  strokes: StrokePoint[][]
) {
  const supabase = createClient();
  const { error } = await supabase.from("drawings").upsert(
    {
      room_id: roomId,
      player_id: playerRowId,
      round_number: roundNumber,
      strokes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "room_id,player_id,round_number" }
  );
  if (error) throw new Error(error.message);
}

export async function fetchDrawingsForRound(roomId: string, roundNumber: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("drawings")
    .select()
    .eq("room_id", roomId)
    .eq("round_number", roundNumber);
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Returns true if every player currently in the room has a saved drawing
// for the given round number (used to detect "everyone finished round 20").
export async function markPart1Done(roomId: string, playerRowId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("players")
    .update({ part1_done: true })
    .eq("id", playerRowId)
    .eq("room_id", roomId);
  if (error) throw new Error(error.message);
}

// Returns true if every player currently in the room has explicitly hit
// Finish on round 20 (not just autosaved a drawing for it — autosave fires
// on the first stroke, well before the player is actually done).
export async function haveAllPlayersFinishedPart1(roomId: string): Promise<boolean> {
  const supabase = createClient();
  const [{ count: totalCount }, { count: doneCount }] = await Promise.all([
    supabase.from("players").select("id", { count: "exact", head: true }).eq("room_id", roomId),
    supabase
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("room_id", roomId)
      .eq("part1_done", true),
  ]);
  if (totalCount == null || doneCount == null) return false;
  return totalCount > 0 && doneCount >= totalCount;
}