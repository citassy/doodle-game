"use client";

import { useEffect, useState } from "react";
import type { Room } from "@/lib/database.types";

export function TransitionScreen() {
  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <p className="font-hand text-3xl text-ink/60 text-center">starting the guessing part…</p>
    </main>
  );
}

export function CountdownScreen({ room }: { room: Room }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!room.phase_deadline) return;
    const deadline = new Date(room.phase_deadline).getTime();

    function tick() {
      const secondsLeft = Math.ceil((deadline - Date.now()) / 1000);
      setLabel(secondsLeft > 0 ? String(secondsLeft) : "go!");
    }

    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [room.phase_deadline]);

  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <p className="font-hand text-7xl font-bold text-ink">{label}</p>
    </main>
  );
}
