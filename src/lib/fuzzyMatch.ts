function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// Damerau-Levenshtein distance (optimal string alignment variant): counts
// insertions, deletions, substitutions, and adjacent-letter transpositions
// as one edit each. Transpositions matter because swapped adjacent letters
// ("hte" for "the") are one of the most common fast-typing mistakes, and
// plain Levenshtein would otherwise count that as two edits.
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1); // transposition
      }
    }
  }
  return dp[m][n];
}

// How many typo "edits" to forgive, scaled to the word's length. Very short
// words get zero tolerance (exact match only) — words like "cat"/"car"/"cap"
// are only one edit apart, so any leniency there risks accepting a
// different real word rather than forgiving an actual typo. Longer and
// multi-word answers get progressively more slack.
function toleranceFor(word: string): number {
  const len = word.length;
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  return 3;
}

export function isGuessCorrect(guess: string, correctWord: string): boolean {
  const g = normalize(guess);
  const c = normalize(correctWord);
  if (!g) return false;
  if (g === c) return true;
  return editDistance(g, c) <= toleranceFor(c);
}