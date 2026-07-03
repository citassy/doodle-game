"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { fetchRoomWords } from "@/lib/roomWords";
import { getMyDrawingCount, getDrawing, saveDrawing, markPart1Done } from "@/lib/drawings";
import { WORD_REVEAL_SECONDS, TOTAL_ROUNDS } from "@/lib/constants";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { CountdownRing } from "@/components/CountdownRing";
import { Button } from "@/components/Button";
import type { Room, Player, RoomWord, StrokePoint } from "@/lib/database.types";

export function DrawingRound({ room, me }: { room: Room; me: Player }) {
  const [words, setWords] = useState<RoomWord[] | null>(null);
  const [personalRound, setPersonalRound] = useState<number | null>(null);
  const [strokes, setStrokes] = useState<StrokePoint[][]>([]);
  const [muted, setMuted] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const savingRef = useRef(false);

  // `me.part1_done` is the single source of truth for "am I done" — it only
  // becomes true when the player explicitly clicks Finish (see below), never
  // just from autosaving a drawing. It comes from the realtime player row,
  // so this stays correct across refreshes too.
  const iAmDone = me.part1_done;

  // One-time setup: load the room's word list and figure out where this
  // player left off (derived from how many drawings they've already saved,
  // so a mid-game refresh resumes in the right place with no extra state).
  // Note: reaching round 20's drawing doesn't mean they clicked Finish, so
  // we clamp here rather than mark them done.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [roomWords, savedCount] = await Promise.all([
        fetchRoomWords(room.id),
        getMyDrawingCount(room.id, me.id),
      ]);
      if (cancelled) return;
      setWords(roomWords);
      setPersonalRound(Math.min(savedCount + 1, TOTAL_ROUNDS));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per mount
  }, []);

  // Hydrate the canvas whenever the personal round changes (covers both
  // normal advancing and the refresh-resume case above).
  useEffect(() => {
    if (personalRound == null || iAmDone) return;
    let cancelled = false;
    (async () => {
      const existing = await getDrawing(room.id, me.id, personalRound);
      if (!cancelled) setStrokes(existing);
    })();
    return () => {
      cancelled = true;
    };
  }, [personalRound, iAmDone, room.id, me.id]);

  const broadcastWord = words?.find((w) => w.round_number === room.current_round)?.word_text ?? "";
  const lastSpokenRound = useRef<number | null>(null);

  // Words can arrive progressively (round-by-round word-giver mode adds one
  // at a time, live, while people are already drawing), so re-fetch whenever
  // the broadcast round advances rather than relying on the one-time fetch
  // above. Cheap query (max 20 rows), safe to run every round regardless of
  // mode.
  useEffect(() => {
    if (room.current_round === 0) return;
    let cancelled = false;
    (async () => {
      const roomWords = await fetchRoomWords(room.id);
      if (!cancelled) setWords(roomWords);
    })();
    return () => {
      cancelled = true;
    };
  }, [room.current_round, room.id]);

  // Announce the broadcast word the moment it's revealed to the room,
  // regardless of which canvas the player is actually drawing on.
  useEffect(() => {
    if (!broadcastWord || muted) return;
    if (lastSpokenRound.current === room.current_round) return;
    lastSpokenRound.current = room.current_round;
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(broadcastWord));
  }, [broadcastWord, room.current_round, muted]);

  const handleStrokesChange = useCallback(
    (next: StrokePoint[][]) => {
      setStrokes(next);
      if (personalRound == null) return;
      savingRef.current = true;
      saveDrawing(room.id, me.id, personalRound, next).finally(() => {
        savingRef.current = false;
      });
    },
    [room.id, me.id, personalRound]
  );

  const canAdvance = personalRound != null && personalRound < room.current_round;
  const isLastRound = personalRound === TOTAL_ROUNDS;

  const advance = useCallback(async () => {
    if (personalRound == null || finishing) return;
    if (isLastRound) {
      setFinishing(true);
      try {
        await markPart1Done(room.id, me.id);
      } finally {
        setFinishing(false);
      }
      return;
    }
    if (!canAdvance) return;
    setPersonalRound(personalRound + 1);
  }, [personalRound, isLastRound, canAdvance, finishing, room.id, me.id]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space") {
        e.preventDefault();
        advance();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [advance]);

  const isRoundByRound = room.word_giver_mode === "player" && room.word_giver_timing === "round_by_round";

  if (iAmDone) {
    return (
      <main className="flex-1 flex items-center justify-center px-6">
        <p className="font-hand text-3xl text-ink/60 text-center">
          nice doodling!
          <br />
          waiting for everyone else to finish…
        </p>
      </main>
    );
  }

  if (personalRound == null || !words) {
    return (
      <main className="flex-1 flex items-center justify-center px-6">
        <p className="font-hand text-2xl text-ink/60">loading round…</p>
      </main>
    );
  }

  if (isRoundByRound && room.current_round === 0) {
    return (
      <main className="flex-1 flex items-center justify-center px-6">
        <p className="font-hand text-2xl text-ink/60 text-center">waiting for the first word…</p>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-3">
          {isRoundByRound ? (
            <span
              className="w-7 h-7 rounded-full border-2 border-border-muted flex items-center justify-center text-xs"
              aria-hidden="true"
            >
              ✎
            </span>
          ) : room.current_round < TOTAL_ROUNDS ? (
            <CountdownRing deadline={room.phase_deadline} durationSeconds={WORD_REVEAL_SECONDS} />
          ) : (
            <span
              className="w-7 h-7 rounded-full border-2 border-coral flex items-center justify-center text-xs"
              aria-hidden="true"
            >
              ✓
            </span>
          )}
          <div className="flex-1">
            <span className="text-sm text-ink/50">
              {!isRoundByRound && room.current_round >= TOTAL_ROUNDS
                ? "last word — finish whenever you're ready"
                : `word ${room.current_round} of ${TOTAL_ROUNDS}`}
            </span>
            <div className="font-hand text-2xl font-bold">{broadcastWord}</div>
          </div>
          <button
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Unmute word read-aloud" : "Mute word read-aloud"}
            className="text-xl text-ink/60 hover:text-ink px-1"
          >
            {muted ? "🔇" : "🔊"}
          </button>
        </div>

        <div className="relative">
          <span className="absolute top-2 left-2.5 z-10 font-hand text-lg text-ink/40">
            {personalRound}
          </span>
          {canAdvance && (
            <span className="absolute top-2 right-2.5 z-10 text-xs text-coral-text bg-coral/40 rounded-full px-2 py-0.5">
              {room.current_round - personalRound} word{room.current_round - personalRound > 1 ? "s" : ""} ahead
            </span>
          )}
          <DrawingCanvas
            key={personalRound}
            initialStrokes={strokes}
            onChange={handleStrokesChange}
          />
        </div>

        <Button onClick={advance} disabled={(!isLastRound && !canAdvance) || finishing} className="w-full mt-3">
          {isLastRound ? (finishing ? "Finishing…" : "Finish") : "Next → (or hit space)"}
        </Button>
        {!isLastRound && !canAdvance && (
          <p className="text-sm text-ink/40 text-center mt-2">waiting for the next word…</p>
        )}
      </div>
    </main>
  );
}