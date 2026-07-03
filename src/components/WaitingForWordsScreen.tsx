"use client";

import { useEffect, useState } from "react";
import { getRoomWordsCount } from "@/lib/wordGiver";
import { TOTAL_ROUNDS } from "@/lib/constants";
import type { Room, Player } from "@/lib/database.types";

export function WaitingForWordsScreen({ room, giver }: { room: Room; giver: Player | undefined }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const c = await getRoomWordsCount(room.id);
      if (!cancelled) setCount(c);
    }
    poll();
    const interval = setInterval(poll, 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [room.id]);

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6">
      <p className="font-hand text-3xl text-ink/60 text-center mb-3">
        waiting for {giver?.name ?? "the word giver"} to write 20 words…
      </p>
      <p className="text-base text-ink/40">
        {count}/{TOTAL_ROUNDS} written
      </p>
    </main>
  );
}