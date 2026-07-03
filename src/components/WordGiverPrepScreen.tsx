"use client";

import { useState, useRef, useEffect } from "react";
import { submitWordGiverWords } from "@/lib/wordGiver";
import { PREP_SECONDS, TOTAL_ROUNDS } from "@/lib/constants";
import { CountdownRing } from "@/components/CountdownRing";
import { TextInput } from "@/components/TextInput";
import { Button } from "@/components/Button";
import type { Room } from "@/lib/database.types";

export function WordGiverPrepScreen({ room }: { room: Room }) {
  const [words, setWords] = useState<string[]>(Array(TOTAL_ROUNDS).fill(""));
  const [current, setCurrent] = useState("");
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [index]);

  function commitCurrent(nextIndex: number) {
    if (!current.trim()) return;
    const updated = [...words];
    updated[index] = current.trim();
    setWords(updated);
    setCurrent(updated[nextIndex] ?? "");
    setIndex(nextIndex);
  }

  async function handleSubmit(finalWords: string[]) {
    setError("");
    setSubmitting(true);
    try {
      await submitWordGiverWords(room.id, finalWords);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  const allFilled = words.every((w) => w.trim()) && !current.trim() ? words : null;
  const readyWords = (() => {
    const preview = [...words];
    if (current.trim()) preview[index] = current.trim();
    return preview.every((w) => w.trim()) ? preview : null;
  })();

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <CountdownRing deadline={room.phase_deadline} durationSeconds={PREP_SECONDS} />
          <div>
            <p className="text-sm text-ink/50">word {index + 1} of {TOTAL_ROUNDS}</p>
            <p className="font-hand text-xl font-bold">write a word to draw</p>
          </div>
        </div>

        <form
          className="flex gap-2 mb-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (index < TOTAL_ROUNDS - 1) commitCurrent(index + 1);
          }}
        >
          <TextInput
            ref={inputRef}
            placeholder="e.g. basketball"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <Button type="submit" variant="secondary" disabled={!current.trim() || index >= TOTAL_ROUNDS - 1}>
            Next
          </Button>
        </form>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {words.map((w, i) => (
            <button
              key={i}
              onClick={() => {
                if (current.trim()) commitCurrent(i);
                else setIndex(i);
                setCurrent(words[i]);
              }}
              className={`w-7 h-7 rounded-full text-xs flex items-center justify-center border-[1.5px] ${
                i === index
                  ? "border-ink bg-ink text-paper"
                  : w.trim()
                  ? "border-green bg-green/30 text-green-text"
                  : "border-border-muted text-ink/40"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {error && <p className="text-base text-coral-text mb-2">{error}</p>}

        <Button
          onClick={() => readyWords && handleSubmit(readyWords)}
          disabled={!readyWords || submitting}
          className="w-full"
        >
          {submitting ? "Starting…" : allFilled ? "Start the game" : `${words.filter((w) => w.trim()).length}/${TOTAL_ROUNDS} written`}
        </Button>
      </div>
    </main>
  );
}