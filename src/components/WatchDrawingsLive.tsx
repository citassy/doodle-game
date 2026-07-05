"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { submitNextWord } from "@/lib/wordGiver";
import { getWordForRound, isRevealConditionMetSync, tryAdvanceRound } from "@/lib/roundReveal";
import { TOTAL_ROUNDS } from "@/lib/constants";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { CountdownRing } from "@/components/CountdownRing";
import { TextInput } from "@/components/TextInput";
import { Button } from "@/components/Button";
import type { Room, Player, Drawing } from "@/lib/database.types";

export function WatchDrawingsLive({ room, players }: { room: Room; players: Player[] }) {
  const [latestByPlayer, setLatestByPlayer] = useState<Record<string, Drawing>>({});
  const [nextWord, setNextWord] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [queuedWord, setQueuedWord] = useState<string | null>(null);

  const isRoundByRound = room.word_giver_mode === "player" && room.word_giver_timing === "round_by_round";
  const nextRoundNumber = room.current_round + 1;
  const allWordsGiven = isRoundByRound && room.current_round >= TOTAL_ROUNDS;
  // `players` here is already the drawer list (word-giver excluded by the
  // caller) and is already realtime-subscribed one level up, so this is
  // free — no query, no poll.
  const readyCount = players.filter((p) => p.ready_for_round === room.current_round).length;
  const revealConditionMet = isRevealConditionMetSync(room, players);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const supabase = createClient();
      const { data } = await supabase
        .from("drawings")
        .select()
        .eq("room_id", room.id)
        .order("round_number", { ascending: true });
      if (cancelled || !data) return;
      const latest: Record<string, Drawing> = {};
      for (const d of data as Drawing[]) {
        latest[d.player_id] = d; // last write per player wins, since ordered ascending
      }
      setLatestByPlayer(latest);
    }
    poll();
    const interval = setInterval(poll, 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [room.id]);

  // Whenever the broadcast round changes (meaning whatever was queued just
  // got revealed), check whether the new "next" slot already has a word —
  // covers refresh-while-queued, and clears the queued state once revealed.
  useEffect(() => {
    if (!isRoundByRound) return;
    let cancelled = false;
    (async () => {
      const existing = await getWordForRound(room.id, nextRoundNumber);
      if (!cancelled) setQueuedWord(existing);
    })();
    return () => {
      cancelled = true;
    };
  }, [isRoundByRound, room.id, nextRoundNumber]);

  async function handleSubmitWord(e: React.FormEvent) {
    e.preventDefault();
    if (!nextWord.trim() || queuedWord) return;
    setError("");
    setSubmitting(true);
    try {
      await submitNextWord(room.id, nextRoundNumber, nextWord);
      setQueuedWord(nextWord.trim());
      setNextWord("");
      // The reveal condition might already be met (e.g. everyone was ready
      // and just waiting on this) — check right away instead of waiting for
      // the host's next background poll.
      await tryAdvanceRound(room);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-3xl">
        {isRoundByRound && (
          <div className="mb-6 max-w-md mx-auto">
            {allWordsGiven ? (
              <p className="text-base text-ink/40 text-center">
                all 20 words given — waiting for everyone to finish…
              </p>
            ) : queuedWord ? (
              <>
                <div className="flex items-center gap-2">
                  <TextInput value={queuedWord} disabled className="opacity-60" />
                  <Button disabled className="opacity-60">
                    Announce
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <CountdownRing deadline={room.phase_deadline} durationSeconds={room.draw_seconds} size={24} />
                  <p className="text-sm text-ink/40">waiting for the next round…</p>
                </div>
              </>
            ) : (
              <>
                <form onSubmit={handleSubmitWord} className="flex items-center gap-2">
                  <TextInput
                    autoFocus
                    placeholder={`word ${nextRoundNumber} of ${TOTAL_ROUNDS}`}
                    value={nextWord}
                    onChange={(e) => setNextWord(e.target.value)}
                  />
                  <Button type="submit" disabled={submitting || !nextWord.trim()}>
                    Announce
                  </Button>
                </form>
                <div className="flex items-center gap-2 mt-2">
                  <CountdownRing deadline={room.phase_deadline} durationSeconds={room.draw_seconds} size={24} />
                  <p className="text-sm text-ink/40">
                    {revealConditionMet
                      ? "everyone's ready for the next word!"
                      : `${readyCount}/${players.length} drawers ready`}
                  </p>
                </div>
              </>
            )}
            {error && <p className="text-base text-coral-text mt-2 text-center">{error}</p>}
          </div>
        )}

        <p className="font-hand text-2xl font-bold text-center mb-6">watching everyone doodle…</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
          {players.map((p) => {
            const drawing = latestByPlayer[p.id];
            return (
              <div key={p.id} className="text-center">
                <div className="relative">
                  <span className="absolute top-2 left-2.5 z-10 font-hand text-lg text-ink/40">
                    {drawing?.round_number ?? "—"}
                  </span>
                  <DrawingCanvas initialStrokes={drawing?.strokes ?? []} onChange={() => {}} disabled />
                </div>
                <p className="text-base font-medium mt-2">{p.name}</p>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}