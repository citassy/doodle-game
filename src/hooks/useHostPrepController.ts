"use client";

import { useEffect, useRef } from "react";
import { finalizePrepWithFallback } from "@/lib/wordGiver";
import type { Room } from "@/lib/database.types";

export function useHostPrepController(room: Room | null, isHost: boolean) {
  const busy = useRef(false);

  useEffect(() => {
    if (!isHost || !room || room.status !== "prep" || !room.phase_deadline) return;

    const tick = async () => {
      if (busy.current || !room?.phase_deadline) return;
      if (Date.now() < new Date(room.phase_deadline).getTime()) return;
      busy.current = true;
      try {
        await finalizePrepWithFallback(room.id);
      } finally {
        busy.current = false;
      }
    };

    const interval = setInterval(() => {
      tick().catch((err) => console.error("prep controller tick failed:", err));
    }, 500);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally narrow, same pattern as other host controller hooks
  }, [isHost, room?.status, room?.phase_deadline, room?.id]);
}