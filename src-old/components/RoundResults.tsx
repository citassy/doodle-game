"use client";

import { useEffect, useState } from "react";
import { fetchRoomWords } from "@/lib/roomWords";
import { fetchDrawingsForRound } from "@/lib/drawings";
import { fetchRoundGuesses, beginGuessCountdown, endGame } from "@/lib/guessing";
import { TOTAL_ROUNDS } from "@/lib/constants";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { Button } from "@/components/Button";
import type { Room, Player, RoomWord, Drawing, Guess } from "@/lib/database.types";

export function RoundResults({
  room,
  me,
  players,
}: {
  room: Room;
  me: Player;
  players: Player[];
}) {
  const targetRound = room.revealed_numbers[room.revealed_numbers.length - 1];
  const [words, setWords] = useState<RoomWord[] | null>(null);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (targetRound == null) return;
    let cancelled = false;
    (async () => {
      const [roomWords, roundDrawings, roundGuesses] = await Promise.all([
        fetchRoomWords(room.id),
        fetchDrawingsForRound(room.id, targetRound),
        fetchRoundGuesses(room.id, targetRound),
      ]);
      if (cancelled) return;
      setWords(roomWords);
      setDrawings(roundDrawings);
      setGuesses(roundGuesses);
    })();
    return () => {
      cancelled = true;
    };
  }, [targetRound, room.id]);

  if (targetRound == null || !words) {
    return (
      <main className="flex-1 flex items-center justify-center px-6">
        <p className="font-hand text-2xl text-ink/60">loading results…</p>
      </main>
    );
  }

  const correctWord = words.find((w) => w.round_number === targetRound)?.word_text ?? "";
  const isLastRound = room.revealed_numbers.length >= TOTAL_ROUNDS;
  const isPlayerWordGiver = room.word_giver_mode === "player";
  // The word-giver never draws or guesses, so they don't belong in this grid
  // — they get their own unified view (WordGiverGuessView) instead.
  const drawers = isPlayerWordGiver
    ? players.filter((p) => p.id !== room.word_giver_player_id)
    : players;

  async function handleNextRound() {
    setBusy(true);
    try {
      await beginGuessCountdown(room.id, room.revealed_numbers);
    } finally {
      setBusy(false);
    }
  }

  async function handleEndGame() {
    setBusy(true);
    try {
      await endGame(room.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-3xl">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-ink/50">round {room.revealed_numbers.length} of {TOTAL_ROUNDS}</span>
          <span className="font-hand text-2xl font-bold bg-green/40 rounded-md px-3 py-0.5 -rotate-1">
            {correctWord}
          </span>
          <span className="w-24" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
          {drawers.map((p) => {
            const sourceId = room.mix_drawings ? room.drawing_source_map[p.id] ?? p.id : p.id;
            const drawing = drawings.find((d) => d.player_id === sourceId);
            const guess = guesses.find((g) => g.player_id === p.id);
            const sourceName =
              room.mix_drawings && sourceId !== p.id
                ? drawers.find((d) => d.id === sourceId)?.name
                : null;
            return (
              <div key={p.id} className="text-center">
                <div className="relative">
                  {guess?.is_correct && (
                    <span className="absolute -top-2 -right-2 z-10 bg-green text-green-text text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      +1
                    </span>
                  )}
                  <DrawingCanvas initialStrokes={drawing?.strokes ?? []} onChange={() => {}} disabled />
                </div>
                <p className="text-base font-medium mt-2">{p.name}</p>
                {sourceName && <p className="text-xs text-ink/40">(drew by {sourceName})</p>}
                <p
                  className={`font-hand text-lg ${
                    guess?.is_correct ? "text-green-text" : guess ? "text-coral-text" : "text-ink/40"
                  }`}
                >
                  {guess ? (guess.guess_text || "(blank)") : "no guess"}
                </p>
              </div>
            );
          })}
        </div>

        {isPlayerWordGiver && !isLastRound ? (
          <p className="text-base text-ink/40 text-center mt-6">
            waiting for the word giver to pick the next drawing…
          </p>
        ) : (
          me.is_host && (
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={handleEndGame} disabled={busy}>
                End game
              </Button>
              {!isLastRound && (
                <Button onClick={handleNextRound} disabled={busy}>
                  Next round →
                </Button>
              )}
            </div>
          )
        )}
      </div>
    </main>
  );
}