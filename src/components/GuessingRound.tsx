"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { fetchRoomWords } from "@/lib/roomWords";
import { getDrawing } from "@/lib/drawings";
import { getMyGuess, submitGuess } from "@/lib/guessing";
import { GUESS_SECONDS } from "@/lib/constants";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { CountdownRing } from "@/components/CountdownRing";
import { TextInput } from "@/components/TextInput";
import { Button } from "@/components/Button";
import type { Room, Player, RoomWord, StrokePoint } from "@/lib/database.types";

export function GuessingRound({ room, me }: { room: Room; me: Player }) {
  const targetRound = room.revealed_numbers[room.revealed_numbers.length - 1];

  const [words, setWords] = useState<RoomWord[] | null>(null);
  const [strokes, setStrokes] = useState<StrokePoint[][]>([]);
  const [guessText, setGuessText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const autoSubmitted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const roomWords = await fetchRoomWords(room.id);
      if (!cancelled) setWords(roomWords);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- word list is static for the whole game
  }, []);

  useEffect(() => {
    if (targetRound == null) return;
    let cancelled = false;
    (async () => {
      const [drawing, existingGuess] = await Promise.all([
        getDrawing(room.id, me.id, targetRound),
        getMyGuess(room.id, me.id, targetRound),
      ]);
      if (cancelled) return;
      setStrokes(drawing);
      if (existingGuess) {
        setGuessText(existingGuess.guess_text);
        setSubmitted(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetRound, room.id, me.id]);

  const correctWord = words?.find((w) => w.round_number === targetRound)?.word_text ?? "";

  const doSubmit = useCallback(
    async (text: string) => {
      if (submitted || targetRound == null || !correctWord) return;
      setSubmitting(true);
      try {
        await submitGuess(room.id, me.id, targetRound, text, correctWord);
        setSubmitted(true);
      } finally {
        setSubmitting(false);
      }
    },
    [submitted, targetRound, correctWord, room.id, me.id]
  );

  useEffect(() => {
    if (!room.phase_deadline || submitted) return;
    const deadline = new Date(room.phase_deadline).getTime();
    const interval = setInterval(() => {
      if (Date.now() >= deadline && !autoSubmitted.current && !submitted) {
        autoSubmitted.current = true;
        doSubmit(guessText);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [room.phase_deadline, submitted, guessText, doSubmit]);

  if (targetRound == null || !words) {
    return (
      <main className="flex-1 flex items-center justify-center px-6">
        <p className="font-hand text-2xl text-ink/60">loading round…</p>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-3">
          <CountdownRing deadline={room.phase_deadline} durationSeconds={GUESS_SECONDS} />
          {submitted ? (
            <TextInput value={guessText} disabled className="flex-1 opacity-60" />
          ) : (
            <form
              className="flex-1 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                doSubmit(guessText);
              }}
            >
              <TextInput
                autoFocus
                placeholder="Enter your guess"
                value={guessText}
                onChange={(e) => setGuessText(e.target.value)}
              />
              <Button type="submit" disabled={submitting || !guessText.trim()}>
                Submit
              </Button>
            </form>
          )}
        </div>

        <DrawingCanvas key={targetRound} initialStrokes={strokes} onChange={() => {}} disabled />

        {submitted && (
          <p className="text-sm text-ink/40 text-center mt-3">
            guess submitted — waiting for everyone else…
          </p>
        )}
      </div>
    </main>
  );
}