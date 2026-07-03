"use client";

import { useEffect, useRef } from "react";
import {
  beginGuessCountdown,
  startGuessTimer,
  goToRoundResults,
  haveAllPlayersGuessed,
} from "@/lib/guessing";
import type { Room } from "@/lib/database.types";

export function useHostGuessingController(room: Room | null, isHost: boolean) {
  const busy = useRef(false);

  useEffect(() => {
    if (!isHost || !room) return;

    async function tick() {
      if (busy.current || !room) return;

      if (room.status === "transition") {
        if (room.word_giver_mode === "player") return; // word-giver picks manually instead
        busy.current = true;
        try {
          await beginGuessCountdown(room.id, room.revealed_numbers);
        } finally {
          busy.current = false;
        }
        return;
      }

      if (room.status === "countdown" && room.phase_deadline) {
        if (Date.now() >= new Date(room.phase_deadline).getTime()) {
          busy.current = true;
          try {
            await startGuessTimer(room.id);
          } finally {
            busy.current = false;
          }
        }
        return;
      }

      if (room.status === "guessing" && room.phase_deadline) {
        const targetRound = room.revealed_numbers[room.revealed_numbers.length - 1];
        const timedOut = Date.now() >= new Date(room.phase_deadline).getTime();
        const excludePlayerId = room.word_giver_mode === "player" ? room.word_giver_player_id : null;
        const allDone = timedOut
          ? true
          : await haveAllPlayersGuessed(room.id, targetRound, excludePlayerId);
        if (allDone) {
          busy.current = true;
          try {
            await goToRoundResults(room.id);
          } finally {
            busy.current = false;
          }
        }
      }
    }

    // Transition fires once immediately; countdown/guessing are polled.
    // Wrapped in .catch so a transient network failure just gets retried on
    // the next tick instead of crashing as an unhandled rejection.
    function safeTick() {
      tick().catch((err) => console.error("guessing controller tick failed:", err));
    }

    if (room.status === "transition") {
      safeTick();
      return;
    }
    const interval = setInterval(safeTick, 500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally narrow: re-running on every `room` object identity change (which happens on any realtime update) would defeat the point of this list
  }, [isHost, room?.status, room?.phase_deadline, room?.id, room?.revealed_numbers]);
}