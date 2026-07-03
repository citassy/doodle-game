import { createClient } from "@/lib/supabase/client";
import type { Word } from "@/lib/database.types";

// Chance that the next word is deliberately picked to share a tag with the
// previous word (e.g. apple -> orange, both "round"+"food"), rather than a
// fully independent random pick. Tunable after playtesting.
const SIMILARITY_CHANCE = 0.2;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function selectComputerWords(count = 20): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("words").select();
  const bank = data as Word[] | null;
  if (error || !bank || bank.length === 0) {
    throw new Error("Word bank is empty — run the seed migration.");
  }

  const pool: Word[] = [...bank];
  const chosen: Word[] = [];
  const recentCategories: string[] = [];

  while (chosen.length < count && pool.length > 0) {
    let candidates = pool.filter((w) => !recentCategories.slice(-2).includes(w.category));
    if (candidates.length === 0) candidates = pool;

    let next: Word;
    const prev = chosen[chosen.length - 1];
    if (prev && Math.random() < SIMILARITY_CHANCE) {
      const similar = candidates.filter((w) => w.tags.some((t: string) => prev.tags.includes(t)));
      next = similar.length > 0 ? pickRandom(similar) : pickRandom(candidates);
    } else {
      next = pickRandom(candidates);
    }

    chosen.push(next);
    recentCategories.push(next.category);
    const idx = pool.findIndex((w) => w.id === next.id);
    pool.splice(idx, 1);
  }

  // If the bank has fewer than `count` words, wrap around rather than fail.
  while (chosen.length < count) {
    chosen.push(pickRandom(bank));
  }

  return chosen.map((w) => w.text);
}
