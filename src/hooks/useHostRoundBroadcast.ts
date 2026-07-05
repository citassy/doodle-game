"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { haveAllPlayersFinishedPart1 } from "@/lib/drawings";
import { tryAdvanceRound } from "@/lib/roundReveal";
import { TOTAL_ROUNDS } from "@/lib/constants";
import type { Room } from "@/lib/database.types";

export function useHostRoundBroadcast(room: Room | null, isHost: boolean) {
  const checkingFinish = useRef(false);

  useEffect(() => {
    if (!isHost || !room || room.status !== "drawing") return;

    const tick = async () => {
      if (!room) return;
      const supabase = createClient();

      // Fallback for the "timer just ran out, nobody clicked anything"
      // case — action-triggered reveals (marking ready, submitting a word)
      // already try this themselves the instant they happen, so this poll
      // only ever matters when nobody's doing anything and the clock alone
      // needs to trigger the reveal.
      if (room.current_round < TOTAL_ROUNDS) {
        const advanced = await tryAdvanceRound(room);
        if (advanced) return;
      }

      // Once every word has been revealed, start polling for "has everyone
      // explicitly clicked Finish on round 20 yet" to move to the
      // transition screen. Guard against overlapping checks with a ref flag.
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