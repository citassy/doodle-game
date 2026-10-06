import { mulberry32, shuffleInPlace } from "./rng";
import { homeOf } from "./shapes";
import type { Geometry, PieceState } from "./types";

/**
 * Initial scatter: pieces are dealt onto slots in a ring around the dashed
 * guide, each with a random quarter turn. Deterministic for a given seed.
 */
export function scatterPieces(g: Geometry): PieceState[] {
  const rand = mulberry32(g.seed ^ 0x9e3779b9);
  const pitch = Math.max(g.cw, g.ch) * 1.15;
  const clear = pitch * 0.5;

  // Grow the outer area until the ring has room for every piece.
  let margin = pitch * 1.5;
  let slots: Array<{ x: number; y: number }> = [];
  for (let attempt = 0; attempt < 40; attempt++) {
    slots = [];
    const halfW = g.width / 2 + margin;
    const halfH = g.height / 2 + margin;
    for (let y = -halfH + pitch / 2; y <= halfH - pitch / 2; y += pitch) {
      for (let x = -halfW + pitch / 2; x <= halfW - pitch / 2; x += pitch) {
        const insideGuide = Math.abs(x) < g.width / 2 + clear && Math.abs(y) < g.height / 2 + clear;
        if (!insideGuide) slots.push({ x, y });
      }
    }
    if (slots.length >= g.count * 1.05) break;
    margin += pitch;
  }

  shuffleInPlace(slots, rand);
  const out: PieceState[] = [];
  for (let i = 0; i < g.count; i++) {
    const s = slots[i % slots.length];
    out.push({
      x: s.x + (rand() - 0.5) * pitch * 0.2,
      y: s.y + (rand() - 0.5) * pitch * 0.2,
      rot: Math.floor(rand() * 4),
    });
  }
  return out;
}

/** The fully solved arrangement (used by tests and the "look at the picture" overlay). */
export function solvedPieces(g: Geometry): PieceState[] {
  const out: PieceState[] = [];
  for (let i = 0; i < g.count; i++) {
    const h = homeOf(g, i);
    out.push({ x: h.x, y: h.y, rot: 0 });
  }
  return out;
}
