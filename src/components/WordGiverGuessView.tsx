"use client";

import { useEffect, useState } from "react";
import { fetchRoomWords } from "@/lib/roomWords";
import { fetchDrawingsForRound } from "@/lib/drawings";
import { fetchRoundGuesses, beginGuessCountdown, endGame } from "@/lib/guessing";
import { TOTAL_ROUNDS } from "@/lib/constants";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { NumberPicker } from "@/components/NumberPicker";
import { Button } from "@/components/Button";
import type { Room, Player, RoomWord, Drawing, Guess } from "@/lib/database.types";

export function WordGiverGuessView({
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
    let cancelled = false;
    (async () => {
      const roomWords = await fetchRoomWords(room.id);
      if (!cancelled) setWords(roomWords);
    })();
    return () => {
      cancelled = true;
    };
  }, [room.id]);

  // Poll drawings + guesses for the current round so the grid fills in live
  // as people submit, rather than only appearing once the round fully ends.
  useEffect(() => {
    if (targetRound == null) return;
    let cancelled = false;
    async function poll() {
      const [roundDrawings, roundGuesses] = await Promise.all([
        fetchDrawingsForRound(room.id, targetRound),
        fetchRoundGuesses(room.id, targetRound),
      ]);
      if (cancelled) return;
      setDrawings(roundDrawings);
      setGuesses(roundGuesses);
    }
    poll();
    const interval = setInterval(poll, 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [targetRound, room.id]);

  const correctWord = words?.find((w) => w.round_number === targetRound)?.word_text ?? "";
  const drawers = players.filter((p) => p.id !== me.id);
  const isLastRound = room.revealed_numbers.length >= TOTAL_ROUNDS;
  const canPickNext = room.status === "round_results" && !isLastRound;

  async function handlePickNumber(n: number) {
    setBusy(true);
    try {
      await beginGuessCountdown(room.id, room.revealed_numbers, n);
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

  if (targetRound == null) {
    return (
      <main className="flex-1 flex items-center justify-center px-6">
        <p className="font-hand text-2xl text-ink/60">loading…</p>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-3xl">
        <div className="mb-6 max-w-md mx-auto">
          <p className="text-sm text-ink/50 mb-2 text-center">
            {canPickNext
              ? "pick the next drawing to guess"
              : `round ${room.revealed_numbers.length} of ${TOTAL_ROUNDS}`}
          </p>
          <NumberPicker
            revealed={room.revealed_numbers}
            onPick={handlePickNumber}
            disabled={!canPickNext || busy}
          />
          <div className="flex justify-center mt-3">
            <Button variant="secondary" onClick={handleEndGame} disabled={busy}>
              End game
            </Button>
          </div>
        </div>

        <p className="font-hand text-2xl font-bold text-center mb-6">{correctWord}</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
          {drawers.map((p) => {
            const drawing = drawings.find((d) => d.player_id === p.id);
            const guess = guesses.find((g) => g.player_id === p.id);
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
                <p
                  className={`font-hand text-lg ${
                    guess?.is_correct ? "text-green-text" : guess ? "text-coral-text" : "text-ink/40"
                  }`}
                >
                  {guess ? guess.guess_text || "(blank)" : "guessing…"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}