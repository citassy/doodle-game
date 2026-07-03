import { createClient } from "@/lib/supabase/client";
import { generateRoomCode } from "@/lib/roomCode";
import { colorForIndex, getLocalPlayerId } from "@/lib/localPlayer";
import { selectComputerWords } from "@/lib/wordSelection";
import { WORD_REVEAL_SECONDS, PREP_SECONDS } from "@/lib/constants";
import type { WordGiverMode, WordGiverTiming } from "@/lib/database.types";

export class RoomError extends Error {}

export async function setWordGiverMode(
  roomId: string,
  mode: WordGiverMode,
  wordGiverPlayerId: string | null
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("rooms")
    .update({ word_giver_mode: mode, word_giver_player_id: mode === "player" ? wordGiverPlayerId : null })
    .eq("id", roomId);
  if (error) throw new RoomError(error.message);
}

export async function setWordGiverTiming(roomId: string, timing: WordGiverTiming) {
  const supabase = createClient();
  const { error } = await supabase.from("rooms").update({ word_giver_timing: timing }).eq("id", roomId);
  if (error) throw new RoomError(error.message);
}

export async function startGame(roomId: string, mode: WordGiverMode, timing: WordGiverTiming) {
  const supabase = createClient();

  if (mode === "computer") {
    const words = await selectComputerWords(20);
    const rows = words.map((word_text, i) => ({
      room_id: roomId,
      round_number: i + 1,
      word_text,
    }));
    const { error: wordsError } = await supabase.from("room_words").insert(rows);
    if (wordsError) throw new RoomError(wordsError.message);

    const deadline = new Date(Date.now() + WORD_REVEAL_SECONDS * 1000).toISOString();
    const { error } = await supabase
      .from("rooms")
      .update({ status: "drawing", current_round: 1, phase_deadline: deadline })
      .eq("id", roomId);
    if (error) throw new RoomError(error.message);
  } else if (timing === "ahead_of_time") {
    const deadline = new Date(Date.now() + PREP_SECONDS * 1000).toISOString();
    const { error } = await supabase
      .from("rooms")
      .update({ status: "prep", phase_deadline: deadline })
      .eq("id", roomId);
    if (error) throw new RoomError(error.message);
  } else {
    // round_by_round: no prep phase, no timer — go straight to drawing with
    // current_round at 0 until the word-giver submits round 1's word.
    const { error } = await supabase
      .from("rooms")
      .update({ status: "drawing", current_round: 0, phase_deadline: null })
      .eq("id", roomId);
    if (error) throw new RoomError(error.message);
  }
}

export async function createRoom(playerName: string) {
  const supabase = createClient();
  const playerId = getLocalPlayerId();

  // Retry on the (rare) chance a generated code collides with an existing room.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({ code })
      .select()
      .single();

    if (roomError) {
      if (roomError.code === "23505") continue; // unique_violation on code, retry
      throw new RoomError(roomError.message);
    }

    const { data: player, error: playerError } = await supabase
      .from("players")
      .insert({
        client_id: playerId,
        room_id: room.id,
        name: playerName.trim(),
        color: colorForIndex(0),
        is_host: true,
      })
      .select()
      .single();

    if (playerError) throw new RoomError(playerError.message);

    const { error: hostError } = await supabase
      .from("rooms")
      .update({ host_player_id: player.id })
      .eq("id", room.id);

    if (hostError) throw new RoomError(hostError.message);

    return { room, player };
  }

  throw new RoomError("Couldn't generate a free room code. Please try again.");
}

export async function joinRoom(playerName: string, code: string) {
  const supabase = createClient();
  const playerId = getLocalPlayerId();
  const normalizedCode = code.trim().toUpperCase();

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select()
    .eq("code", normalizedCode)
    .maybeSingle();

  if (roomError) throw new RoomError(roomError.message);
  if (!room) throw new RoomError("No room found with that code.");

  const { data: existingPlayers, error: existingError } = await supabase
    .from("players")
    .select()
    .eq("room_id", room.id)
    .order("joined_at", { ascending: true });

  if (existingError) throw new RoomError(existingError.message);

  const alreadyIn = existingPlayers?.find((p) => p.client_id === playerId);
  if (alreadyIn) return { room, player: alreadyIn };

  // Only block *new* players once the game has left the lobby — someone
  // rejoining as themselves (handled above) should always get back in.
  if (room.status !== "lobby") {
    throw new RoomError("That game has already started.");
  }

  if ((existingPlayers?.length ?? 0) >= room.max_players) {
    throw new RoomError("That room is full.");
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      client_id: playerId,
      room_id: room.id,
      name: playerName.trim(),
      color: colorForIndex(existingPlayers?.length ?? 0),
      is_host: false,
    })
    .select()
    .single();

  if (playerError) throw new RoomError(playerError.message);

  return { room, player };
}