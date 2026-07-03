import { createClient } from "@/lib/supabase/client";
import { selectComputerWords } from "@/lib/wordSelection";
import { TOTAL_ROUNDS } from "@/lib/constants";

export async function getRoomWordsCount(roomId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("room_words")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// --- Ahead-of-time mode ---------------------------------------------------

// Called by the word-giver once they've written all 20 (or want to submit
// early). Saves the words and immediately starts round 1.
export async function submitWordGiverWords(roomId: string, words: string[], drawSeconds: number) {
  if (words.length !== TOTAL_ROUNDS || words.some((w) => !w.trim())) {
    throw new Error(`Need exactly ${TOTAL_ROUNDS} non-empty words.`);
  }
  const supabase = createClient();
  const rows = words.map((word_text, i) => ({
    room_id: roomId,
    round_number: i + 1,
    word_text: word_text.trim(),
  }));
  const { error: wordsError } = await supabase.from("room_words").upsert(rows, {
    onConflict: "room_id,round_number",
  });
  if (wordsError) throw new Error(wordsError.message);

  const deadline = new Date(Date.now() + drawSeconds * 1000).toISOString();
  const { error } = await supabase
    .from("rooms")
    .update({ status: "drawing", current_round: 1, phase_deadline: deadline })
    .eq("id", roomId);
  if (error) throw new Error(error.message);
}

// Host-only safety net: if the word-giver's 2.5 minutes run out (whether
// they're still typing, distracted, or their tab died), fill in whatever
// rounds they didn't finish with computer-picked words so the game isn't
// stuck waiting on one person indefinitely.
export async function finalizePrepWithFallback(roomId: string, drawSeconds: number) {
  const supabase = createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("room_words")
    .select("round_number")
    .eq("room_id", roomId);
  if (fetchError) throw new Error(fetchError.message);

  const filledRounds = new Set((existing ?? []).map((r) => r.round_number));
  const missingCount = TOTAL_ROUNDS - filledRounds.size;

  if (missingCount > 0) {
    const fallbackWords = await selectComputerWords(missingCount);
    const rows = Array.from({ length: TOTAL_ROUNDS }, (_, i) => i + 1)
      .filter((round) => !filledRounds.has(round))
      .map((round_number, i) => ({
        room_id: roomId,
        round_number,
        word_text: fallbackWords[i],
      }));
    const { error: insertError } = await supabase.from("room_words").upsert(rows, {
      onConflict: "room_id,round_number",
    });
    if (insertError) throw new Error(insertError.message);
  }

  const deadline = new Date(Date.now() + drawSeconds * 1000).toISOString();
  const { error } = await supabase
    .from("rooms")
    .update({ status: "drawing", current_round: 1, phase_deadline: deadline })
    .eq("id", roomId);
  if (error) throw new Error(error.message);
}

// --- Round-by-round mode ---------------------------------------------------

// Called by the word-giver each time they submit the next word. Saves it and
// immediately announces it (advances current_round) — no timer involved.
export async function submitNextWord(roomId: string, roundNumber: number, wordText: string) {
  if (!wordText.trim()) throw new Error("Word can't be empty.");
  const supabase = createClient();
  const { error: wordError } = await supabase.from("room_words").upsert(
    {
      room_id: roomId,
      round_number: roundNumber,
      word_text: wordText.trim(),
    },
    { onConflict: "room_id,round_number" }
  );
  if (wordError) throw new Error(wordError.message);

  const { error } = await supabase
    .from("rooms")
    .update({ current_round: roundNumber })
    .eq("id", roomId);
  if (error) throw new Error(error.message);
}