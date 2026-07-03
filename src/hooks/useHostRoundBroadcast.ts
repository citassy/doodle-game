"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { haveAllPlayersFinishedPart1 } from "@/lib/drawings";
import { WORD_REVEAL_SECONDS, TOTAL_ROUNDS } from "@/lib/constants";
import type { Room } from "@/lib/database.types";

export function useHostRoundBroadcast(room: Room | null, isHost: boolean) {
  const checkingFinish = useRef(false);

  useEffect(() => {
    if (!isHost || !room || room.status !== "drawing") return;

    const tick = async () => {
      if (!room) return;
      const supabase = createClient();

      // Advance the shared word-reveal schedule.
      if (room.current_round < TOTAL_ROUNDS && room.phase_deadline) {
        const deadline = new Date(room.phase_deadline).getTime();
        if (Date.now() >= deadline) {
          const nextRound = room.current_round + 1;
          const nextDeadline = new Date(Date.now() + WORD_REVEAL_SECONDS * 1000).toISOString();
          await supabase
            .from("rooms")
            .update({ current_round: nextRound, phase_deadline: nextDeadline })
            .eq("id", room.id);
          return;
        }
      }

      // Once every word has been revealed (either the fixed schedule ran
      // its course, or the word-giver has manually given all 20 in
      // round-by-round mode), start polling for "has everyone explicitly
      // clicked Finish on round 20 yet" to move to the transition screen.
      // Guard against overlapping checks with a ref flag.
      if (room.current_round >= TOTAL_ROUNDS && !checkingFinish.current) {
        checkingFinish.current = true;
        try {
          const excludePlayerId =
            room.word_giver_mode === "player" ? room.word_giver_player_id : null;
          const allDone = await haveAllPlayersFinishedPart1(room.id, excludePlayerId);
          if (allDone) {
            await supabase.from("rooms").update({ status: "transition" }).eq("id", room.id);
          }
        } finally {
          checkingFinish.current = false;
        }
      }
    };

    // Wrapped in .catch so a transient network failure just gets retried on
    // the next tick instead of crashing as an unhandled rejection.
    const interval = setInterval(() => {
      tick().catch((err) => console.error("round broadcast tick failed:", err));
    }, 500);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally narrow, same pattern as other host controller hooks
  }, [isHost, room?.status, room?.current_round, room?.phase_deadline, room?.id]);
}