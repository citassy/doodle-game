"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resetRoomForReplay } from "@/lib/guessing";
import { fetchRoomWords } from "@/lib/roomWords";
import { TOTAL_ROUNDS } from "@/lib/constants";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { Button } from "@/components/Button";
import type { Room, Player, Drawing, RoomWord, Guess } from "@/lib/database.types";

export function FinalResults({ room, me, players }: { room: Room; me: Player; players: Player[] }) {
  const [drawingsByPlayer, setDrawingsByPlayer] = useState<Record<string, Drawing[]>>({});
  const [guessesByPlayer, setGuessesByPlayer] = useState<Record<string, Guess[]>>({});
  const [words, setWords] = useState<RoomWord[]>([]);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const [{ data: drawingsData }, { data: guessesData }, roomWords] = await Promise.all([
        supabase.from("drawings").select().eq("room_id", room.id),
        supabase.from("guesses").select().eq("room_id", room.id),
        fetchRoomWords(room.id),
      ]);
      if (cancelled) return;
      if (drawingsData) {
        const grouped: Record<string, Drawing[]> = {};
        for (const d of drawingsData as Drawing[]) {
          (grouped[d.player_id] ??= []).push(d);
        }
        setDrawingsByPlayer(grouped);
      }
      if (guessesData) {
        const grouped: Record<string, Guess[]> = {};
        for (const g of guessesData as Guess[]) {
          (grouped[g.player_id] ??= []).push(g);
        }
        setGuessesByPlayer(grouped);
      }
      setWords(roomWords);
    })();
    return () => {
      cancelled = true;
    };
  }, [room.id]);

  const scorers =
    room.word_giver_mode === "player"
      ? players.filter((p) => p.id !== room.word_giver_player_id)
      : players;
  const ranked = [...scorers].sort((a, b) => b.score - a.score);

  async function handlePlayAgain() {
    setResetting(true);
    try {
      await resetRoomForReplay(room.id);
    } finally {
      setResetting(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-10 overflow-y-auto">
      <div className="w-full max-w-3xl">
        <h1 className="font-hand text-4xl font-bold text-center mb-6 -rotate-1">results</h1>

        <div className="border-2 border-ink rounded-xl mb-8 overflow-hidden">
          {ranked.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center justify-between px-4 py-2.5 border-b border-border-muted last:border-b-0"
            >
              <span className="text-base">
                <span className="text-ink/40 mr-2">{i + 1}.</span>
                {p.name}
              </span>
              <span className="font-hand text-lg font-bold">{p.score} pts</span>
            </div>
          ))}
        </div>

        {ranked.map((p) => {
          const drawings = (drawingsByPlayer[p.id] ?? []).sort((a, b) => a.round_number - b.round_number);
          const guesses = guessesByPlayer[p.id] ?? [];
          if (drawings.length === 0) return null;
          return (
            <div key={p.id} className="mb-8">
              <p className="text-base font-medium mb-2">{p.name}</p>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: TOTAL_ROUNDS }, (_, i) => i + 1).map((round) => {
                  const drawing = drawings.find((d) => d.round_number === round);
                  const word = words.find((w) => w.round_number === round)?.word_text;
                  const guess = guesses.find((g) => g.round_number === round);
                  const wrongGuessText =
                    guess && !guess.is_correct && guess.guess_text.trim() ? guess.guess_text : null;
                  return (
                    <div key={round}>
                      <div className="relative">
                        {guess?.is_correct && (
                          <span className="absolute -top-1.5 -right-1.5 z-10 bg-green text-green-text text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            +1
                          </span>
                        )}
                        <DrawingCanvas
                          initialStrokes={drawing?.strokes ?? []}
                          onChange={() => {}}
                          disabled
                        />
                      </div>
                      {word && (
                        <p className="text-xs text-ink/50 text-center mt-1 truncate" title={word}>
                          {word}
                        </p>
                      )}
                      {wrongGuessText && (
                        <p className="font-hand text-sm text-coral-text text-center leading-tight line-through decoration-coral">
                          {wrongGuessText}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {me.is_host && (
          <div className="flex justify-center mt-4">
            <Button onClick={handlePlayAgain} disabled={resetting}>
              {resetting ? "Resetting…" : "Play again"}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}