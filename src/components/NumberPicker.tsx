"use client";

import { TOTAL_ROUNDS } from "@/lib/constants";

export function NumberPicker({
  revealed,
  onPick,
  disabled = false,
}: {
  revealed: number[];
  onPick: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: TOTAL_ROUNDS }, (_, i) => i + 1).map((n) => {
        const used = revealed.includes(n);
        return (
          <button
            key={n}
            onClick={() => !used && onPick(n)}
            disabled={used || disabled}
            className={`aspect-square rounded-lg border-[1.5px] font-hand text-lg flex items-center justify-center ${
              used
                ? "border-border-muted text-ink/25 line-through"
                : "border-ink hover:bg-coral/20 disabled:opacity-40"
            }`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}