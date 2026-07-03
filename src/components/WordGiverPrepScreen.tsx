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
      await submitWordGiverWords(room.id, finalWords, room.draw_seconds);
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

  // Live preview including whatever's currently being typed, so the list
  // below updates as you type (helps catch duplicates before committing).
  const displayWords = (() => {
    const preview = [...words];
    if (current.trim()) preview[index] = current.trim();
    return preview;
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
            if (index < TOTAL_ROUNDS - 1) {
              commitCurrent(index + 1);
              return;
            }
            // Last word: commit it, and if that completes all 20, start.
            const updated = [...words];
            updated[index] = current.trim();
            setWords(updated);
            if (updated.every((w) => w.trim())) {
              handleSubmit(updated);
            }
          }}
        >
          <TextInput
            ref={inputRef}
            placeholder="e.g. basketball"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <Button type="submit" variant="secondary" disabled={!current.trim()}>
            {index >= TOTAL_ROUNDS - 1 ? "Finish" : "Next"}
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

        {displayWords.some((w) => w.trim()) && (
          <div className="border-[1.5px] border-border-muted rounded-lg mb-4 max-h-40 overflow-y-auto">
            {(() => {
              const counts = new Map<string, number>();
              for (const w of displayWords) {
                const key = w.trim().toLowerCase();
                if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
              }
              return displayWords.map((w, i) => {
                if (!w.trim()) return null;
                const isDuplicate = (counts.get(w.trim().toLowerCase()) ?? 0) > 1;
                return (
                  <div
                    key={i}
                    className={`flex items-baseline gap-2 px-3 py-1.5 border-b border-border-muted last:border-b-0 ${
                      isDuplicate ? "bg-coral/10" : ""
                    }`}
                  >
                    <span className="text-sm text-ink/40 w-5">{i + 1}.</span>
                    <span className={`text-base ${isDuplicate ? "text-coral-text" : ""}`}>{w}</span>
                    {isDuplicate && <span className="text-xs text-coral-text ml-auto">duplicate</span>}
                  </div>
                );
              });
            })()}
          </div>
        )}

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