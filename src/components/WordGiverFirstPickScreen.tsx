"use client";

import { useState } from "react";
import { beginGuessCountdown } from "@/lib/guessing";
import { NumberPicker } from "@/components/NumberPicker";
import type { Room } from "@/lib/database.types";

export function WordGiverFirstPickScreen({ room }: { room: Room }) {
  const [busy, setBusy] = useState(false);

  async function handlePick(n: number) {
    setBusy(true);
    try {
      await beginGuessCountdown(room.id, room.revealed_numbers, n);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6">
      <p className="font-hand text-2xl font-bold text-center mb-4">pick the first drawing to guess</p>
      <div className="w-full max-w-xs">
        <NumberPicker revealed={room.revealed_numbers} onPick={handlePick} disabled={busy} />
      </div>
    </main>
  );
}