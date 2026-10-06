import { rotVec } from "./shapes";
import type { PieceState, Vec } from "./types";

export function translate(pieces: PieceState[], idxs: Iterable<number>, dx: number, dy: number) {
  for (const i of idxs) {
    pieces[i].x += dx;
    pieces[i].y += dy;
  }
}

/**
 * Turns a whole selection by one quarter turn around a single shared pivot, so
 * a cluster stays rigid. dir = 1 is clockwise, -1 is counter-clockwise.
 */
export function rotateAbout(pieces: PieceState[], idxs: number[], pivot: Vec, dir: 1 | -1) {
  for (const i of idxs) {
    const p = pieces[i];
    const rel = rotVec({ x: p.x - pivot.x, y: p.y - pivot.y }, dir);
    p.x = pivot.x + rel.x;
    p.y = pivot.y + rel.y;
    p.rot = (p.rot + dir + 4) % 4;
  }
}

export function centroid(pieces: PieceState[], idxs: number[]): Vec {
  let sx = 0;
  let sy = 0;
  for (const i of idxs) {
    sx += pieces[i].x;
    sy += pieces[i].y;
  }
  const n = Math.max(1, idxs.length);
  return { x: sx / n, y: sy / n };
}
