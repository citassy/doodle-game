import { createClient } from "@/lib/supabase/client";
import { COUNTDOWN_SECONDS, TOTAL_ROUNDS } from "@/lib/constants";

function pickRandomUnrevealed(revealed: number[]): number {
  const remaining = Array.from({ length: TOTAL_ROUNDS }, (_, i) => i + 1).filter(
    (n) => !revealed.includes(n)
  );
  return remaining[Math.floor(Math.random() * remaining.length)];
}

// Appends one round number to revealed_numbers and starts a short 3-2-1
// countdown before the guess timer itself begins. Used both to kick off the
// very first guess round and for every "next round" after. If `chosenTarget`
// is provided (the word-giver manually picking a number), that's used
// instead of a random pick.
export async function beginGuessCountdown(
  roomId: string,
  currentRevealed: number[],
  chosenTarget?: number
) {
  const supabase = createClient();
  const target = chosenTarget ?? pickRandomUnrevealed(currentRevealed);
  const nextRevealed = [...currentRevealed, target];
  const deadline = new Date(Date.now() + COUNTDOWN_SECONDS * 1000).toISOString();
  const { error } = await supabase
    .from("rooms")
    .update({
      status: "countdown",
      revealed_numbers: nextRevealed,
      current_round: nextRevealed.length,
      phase_deadline: deadline,
    })
    .eq("id", roomId);
  if (error) throw new Error(error.message);
}

export async function startGuessTimer(roomId: string, guessSeconds: number) {
  const supabase = createClient();
  const deadline = new Date(Date.now() + guessSeconds * 1000).toISOString();
  const { error } = await supabase
    .from("rooms")
    .update({ status: "guessing", phase_deadline: deadline })
    .eq("id", roomId);
  if (error) throw new Error(error.message);
}

export async function goToRoundResults(roomId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("rooms").update({ status: "round_results" }).eq("id", roomId);
  if (error) throw new Error(error.message);
}

export async function endGame(roomId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("rooms").update({ status: "finished" }).eq("id", roomId);
  if (error) throw new Error(error.message);
}

export async function getMyGuess(roomId: string, playerRowId: string, roundNumber: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("guesses")
    .select()
    .eq("room_id", roomId)
    .eq("player_id", playerRowId)
    .eq("round_number", roundNumber)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function submitGuess(
  roomId: string,
  playerRowId: string,
  roundNumber: number,
  guessText: string,
  correctWord: string
) {
  const supabase = createClient();
  const isCorrect = guessText.trim().toLowerCase() === correctWord.trim().toLowerCase();

  const { error } = await supabase.from("guesses").upsert(
    {
      room_id: roomId,
      player_id: playerRowId,
      round_number: roundNumber,
      guess_text: guessText.trim(),
      is_correct: isCorrect,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "room_id,player_id,round_number" }
  );
  if (error) throw new Error(error.message);

  if (isCorrect) {
    const { data: player, error: fetchError } = await supabase
      .from("players")
      .select("score")
      .eq("id", playerRowId)
      .single();
    if (!fetchError && player) {
      await supabase
        .from("players")
        .update({ score: player.score + 1 })
        .eq("id", playerRowId);
    }
  }

  return isCorrect;
}

export async function fetchRoundGuesses(roomId: string, roundNumber: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("guesses")
    .select()
    .eq("room_id", roomId)
    .eq("round_number", roundNumber);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function haveAllPlayersGuessed(
  roomId: string,
  roundNumber: number,
  excludePlayerId?: string | null
): Promise<boolean> {
  const supabase = createClient();

  let totalQuery = supabase
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);
  let guessQuery = supabase
    .from("guesses")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("round_number", roundNumber);

  if (excludePlayerId) {
    totalQuery = totalQuery.neq("id", excludePlayerId);
    guessQuery = guessQuery.neq("player_id", excludePlayerId);
  }

  const [{ count: totalCount }, { count: guessCount }] = await Promise.all([totalQuery, guessQuery]);
  if (totalCount == null || guessCount == null) return false;
  return totalCount > 0 && guessCount >= totalCount;
}

// Wipes this room's round data and sends everyone back to the lobby.
export async function resetRoomForReplay(roomId: string) {
  const supabase = createClient();
  await Promise.all([
    supabase.from("drawings").delete().eq("room_id", roomId),
    supabase.from("guesses").delete().eq("room_id", roomId),
    supabase.from("room_words").delete().eq("room_id", roomId),
  ]);
  await supabase.from("players").update({ score: 0, part1_done: false }).eq("room_id", roomId);
  const { error } = await supabase
    .from("rooms")
    .update({
      status: "lobby",
      current_round: 0,
      phase_deadline: null,
      revealed_numbers: [],
    })
    .eq("id", roomId);
  if (error) throw new Error(error.message);
}