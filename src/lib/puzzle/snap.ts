import { homeOf, neighborsOf, rotVec } from "./shapes";
import type { Geometry, PieceState } from "./types";
import type { UnionFind } from "./unionFind";

/** How close (as a fraction of a cell) a pair has to be to count as "fitting". */
export const SNAP_TOLERANCE_FRAC = 0.2;

export function snapTolerance(g: Geometry): number {
  return Math.min(g.cw, g.ch) * SNAP_TOLERANCE_FRAC;
}

/**
 * How far piece j is from where it should be if it were joined to piece i.
 * Rotation has to match exactly: rotation only ever happens in 90 degree steps,
 * so a pair is either exactly right or at least 90 degrees off.
 */
export function fitError(g: Geometry, pieces: PieceState[], i: number, j: number): number {
  const a = pieces[i];
  const b = pieces[j];
  if (a.rot !== b.rot) return Infinity;
  const hi = homeOf(g, i);
  const hj = homeOf(g, j);
  const want = rotVec({ x: hj.x - hi.x, y: hj.y - hi.y }, a.rot);
  return Math.hypot(b.x - (a.x + want.x), b.y - (a.y + want.y));
}

export interface Merge {
  /** The piece whose cluster was moved onto the other one. */
  moved: number;
  /** The piece it was joined to. */
  target: number;
}

interface Candidate {
  mover: number;
  target: number;
  err: number;
}

function moveCluster(g: Geometry, pieces: PieceState[], uf: UnionFind, anyMember: number, dx: number, dy: number) {
  const root = uf.find(anyMember);
  for (let i = 0; i < g.count; i++) {
    if (uf.find(i) === root) {
      pieces[i].x += dx;
      pieces[i].y += dy;
    }
  }
}

function joinPair(g: Geometry, pieces: PieceState[], uf: UnionFind, mover: number, target: number): Merge {
  // Slide the mover's whole cluster so the pair lines up exactly, then merge.
  const hm = homeOf(g, mover);
  const ht = homeOf(g, target);
  const want = rotVec({ x: ht.x - hm.x, y: ht.y - hm.y }, pieces[mover].rot);
  const dx = pieces[target].x - want.x - pieces[mover].x;
  const dy = pieces[target].y - want.y - pieces[mover].y;
  moveCluster(g, pieces, uf, mover, dx, dy);
  uf.union(mover, target);
  return { moved: mover, target };
}

/**
 * Auto-snap. After a drop, join whatever the dropped pieces fit against,
 * wherever they were put down. Keeps going so one drop can close several seams.
 * Mutates pieces and uf; returns the merges that happened.
 */
export function autoSnap(g: Geometry, pieces: PieceState[], uf: UnionFind, dropped: number[]): Merge[] {
  const tol = snapTolerance(g);
  const merges: Merge[] = [];
  let active = new Set(dropped);

  for (let guard = 0; guard < g.count; guard++) {
    let best: Candidate | null = null;
    for (const p of active) {
      for (const n of neighborsOf(g, p)) {
        if (uf.same(p, n)) continue;
        const err = fitError(g, pieces, p, n);
        if (err <= tol && (!best || err < best.err)) best = { mover: p, target: n, err };
      }
    }
    if (!best) break;
    merges.push(joinPair(g, pieces, uf, best.mover, best.target));
    // Everything in the merged cluster is now a fresh candidate.
    active = new Set(uf.membersOf(uf.find(best.mover)));
  }
  return merges;
}

/**
 * Manual snap: only looks at the pieces the player has gathered together
 * (the selection). Joins the pairs that fit, ignores the rest, and never moves
 * anything that doesn't fit.
 */
export function manualSnap(g: Geometry, pieces: PieceState[], uf: UnionFind, selected: number[]): Merge[] {
  const tol = snapTolerance(g);
  const merges: Merge[] = [];
  const inSel = new Set(selected);

  for (let guard = 0; guard < g.count; guard++) {
    let best: Candidate | null = null;
    for (const p of inSel) {
      for (const n of neighborsOf(g, p)) {
        if (!inSel.has(n) || uf.same(p, n)) continue;
        const err = fitError(g, pieces, p, n);
        if (err <= tol && (!best || err < best.err)) best = { mover: p, target: n, err };
      }
    }
    if (!best) break;
    // Move the smaller cluster onto the bigger one.
    const [mover, target] =
      uf.sizeOf(best.mover) <= uf.sizeOf(best.target) ? [best.mover, best.target] : [best.target, best.mover];
    merges.push(joinPair(g, pieces, uf, mover, target));
  }
  return merges;
}

/** True when two or more separate clusters are in the selection (Snap has work to do). */
export function canManualSnap(uf: UnionFind, selected: number[]): boolean {
  const roots = new Set<number>();
  for (const i of selected) roots.add(uf.find(i));
  return roots.size >= 2;
}

export function isSolved(uf: UnionFind): boolean {
  return uf.count === 1;
}
