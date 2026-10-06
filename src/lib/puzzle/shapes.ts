import { mulberry32 } from "./rng";
import type { Geometry, PathCmd, Vec } from "./types";

/** World-space cell width. Everything else scales from it. */
export const CELL_WORLD = 100;

export function makeGeometry(args: {
  seed: number;
  cols: number;
  rows: number;
  imageW: number;
  imageH: number;
}): Geometry {
  const { seed, cols, rows, imageW, imageH } = args;
  const cw = CELL_WORLD;
  // Keep the picture's true shape even when cols/rows are not a perfect match.
  const ch = (cw * (imageH / rows)) / (imageW / cols);
  return { seed, cols, rows, cw, ch, width: cols * cw, height: rows * ch, count: cols * rows };
}

export function indexOf(g: Geometry, r: number, c: number): number {
  return r * g.cols + c;
}

export function rowOf(g: Geometry, idx: number): number {
  return Math.floor(idx / g.cols);
}

export function colOf(g: Geometry, idx: number): number {
  return idx % g.cols;
}

/** Home position (cell centre) of a piece when the puzzle is solved and upright. */
export function homeOf(g: Geometry, idx: number): Vec {
  const r = rowOf(g, idx);
  const c = colOf(g, idx);
  return { x: (c + 0.5) * g.cw - g.width / 2, y: (r + 0.5) * g.ch - g.height / 2 };
}

/** Rotate a vector by k quarter turns clockwise (screen coordinates, y down). */
export function rotVec(v: Vec, k: number): Vec {
  switch (((k % 4) + 4) % 4) {
    case 1:
      return { x: -v.y, y: v.x };
    case 2:
      return { x: -v.x, y: -v.y };
    case 3:
      return { x: v.y, y: -v.x };
    default:
      return { x: v.x, y: v.y };
  }
}

interface EdgeSpec {
  dir: 1 | -1;
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
}

export interface Edges {
  /** h[r][c]: the edge above row r at column c (r = 0..rows). */
  h: EdgeSpec[][];
  /** v[r][c]: the edge left of column c at row r (c = 0..cols). */
  v: EdgeSpec[][];
}

const JITTER = 0.04;
const TAB = 0.1;

/**
 * Generates every edge in a fixed order from the room seed, so every browser
 * ends up with the exact same set of interlocking edges.
 */
export function generateEdges(g: Geometry): Edges {
  const rand = mulberry32(g.seed);
  const j = () => (rand() * 2 - 1) * JITTER;
  const make = (): EdgeSpec => ({ dir: rand() < 0.5 ? 1 : -1, a: j(), b: j(), c: j(), d: j(), e: j() });
  const h: EdgeSpec[][] = [];
  for (let r = 0; r <= g.rows; r++) {
    const row: EdgeSpec[] = [];
    for (let c = 0; c < g.cols; c++) row.push(make());
    h.push(row);
  }
  const v: EdgeSpec[][] = [];
  for (let r = 0; r < g.rows; r++) {
    const row: EdgeSpec[] = [];
    for (let c = 0; c <= g.cols; c++) row.push(make());
    v.push(row);
  }
  return { h, v };
}

type Seg = [Vec, Vec, Vec]; // one cubic: control 1, control 2, end

/** The three cubic segments of one edge, from S to E, bulging by spec.dir. */
function edgeSegments(s: Vec, e: Vec, perp: Vec, spec: EdgeSpec): Seg[] {
  const len = Math.hypot(e.x - s.x, e.y - s.y);
  const ux = (e.x - s.x) / len;
  const uy = (e.y - s.y) / len;
  const pt = (u: number, w: number): Vec => ({
    x: s.x + ux * u * len + perp.x * w * len * spec.dir,
    y: s.y + uy * u * len + perp.y * w * len * spec.dir,
  });
  const { a, b, c, d, e: ee } = spec;
  const t = TAB;
  const p1 = pt(0.2, a);
  const p2 = pt(0.5 + b + d, -t + c);
  const p3 = pt(0.5 - t + b, t + c);
  const p4 = pt(0.5 - 2 * t + b - d, 3 * t + c);
  const p5 = pt(0.5 + 2 * t + b - d, 3 * t + c);
  const p6 = pt(0.5 + t + b, t + c);
  const p7 = pt(0.5 + b + d, -t + c);
  const p8 = pt(0.8, ee);
  const p9: Vec = { x: e.x, y: e.y };
  return [
    [p1, p2, p3],
    [p4, p5, p6],
    [p7, p8, p9],
  ];
}

/** Segments for travelling an edge backwards (neighbour's side of the same edge). */
function reverseSegments(start: Vec, segs: Seg[]): Seg[] {
  const pts: Vec[] = [start];
  for (const s of segs) pts.push(s[0], s[1], s[2]);
  const rev = pts.reverse();
  const out: Seg[] = [];
  for (let i = 1; i < rev.length; i += 3) out.push([rev[i], rev[i + 1], rev[i + 2]]);
  return out;
}

/**
 * Outline of one piece, in coordinates relative to the piece's own cell centre.
 * Walks the four sides clockwise; flat on the puzzle border.
 */
export function piecePath(g: Geometry, edges: Edges, idx: number): PathCmd[] {
  const r = rowOf(g, idx);
  const c = colOf(g, idx);
  const left = c * g.cw;
  const right = (c + 1) * g.cw;
  const top = r * g.ch;
  const bottom = (r + 1) * g.ch;
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const rel = (p: Vec): Vec => ({ x: p.x - cx, y: p.y - cy });

  const tl: Vec = { x: left, y: top };
  const tr: Vec = { x: right, y: top };
  const br: Vec = { x: right, y: bottom };
  const bl: Vec = { x: left, y: bottom };
  const down: Vec = { x: 0, y: 1 };
  const rightV: Vec = { x: 1, y: 0 };

  const cmds: PathCmd[] = [];
  const m = rel(tl);
  cmds.push(["M", m.x, m.y]);

  const pushSegs = (segs: Seg[]) => {
    for (const [p1, p2, p3] of segs) {
      const a = rel(p1);
      const b = rel(p2);
      const e = rel(p3);
      cmds.push(["C", a.x, a.y, b.x, b.y, e.x, e.y]);
    }
  };
  const pushLine = (p: Vec) => {
    const q = rel(p);
    cmds.push(["L", q.x, q.y]);
  };

  // top: left -> right (edge h[r][c], canonical direction)
  if (r === 0) pushLine(tr);
  else pushSegs(edgeSegments(tl, tr, down, edges.h[r][c]));
  // right: top -> bottom (edge v[r][c+1], canonical direction)
  if (c === g.cols - 1) pushLine(br);
  else pushSegs(edgeSegments(tr, br, rightV, edges.v[r][c + 1]));
  // bottom: right -> left (edge h[r+1][c], reversed)
  if (r === g.rows - 1) pushLine(bl);
  else pushSegs(reverseSegments(bl, edgeSegments(bl, br, down, edges.h[r + 1][c])));
  // left: bottom -> top (edge v[r][c], reversed)
  if (c === 0) pushLine(tl);
  else pushSegs(reverseSegments(tl, edgeSegments(tl, bl, rightV, edges.v[r][c])));

  return cmds;
}

/** Exact bounds of an outline (samples every curve), relative to the cell centre. */
export function pathBounds(cmds: PathCmd[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let cur: Vec = { x: 0, y: 0 };
  const add = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };
  for (const cmd of cmds) {
    if (cmd[0] === "M" || cmd[0] === "L") {
      add(cmd[1], cmd[2]);
      cur = { x: cmd[1], y: cmd[2] };
    } else {
      const [, x1, y1, x2, y2, x, y] = cmd;
      for (let i = 1; i <= 16; i++) {
        const t = i / 16;
        const u = 1 - t;
        add(
          u * u * u * cur.x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x,
          u * u * u * cur.y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y
        );
      }
      cur = { x, y };
    }
  }
  return { minX, minY, maxX, maxY };
}

export function pathToSvg(cmds: PathCmd[]): string {
  return (
    cmds
      .map((c) => (c[0] === "C" ? `C${c[1]},${c[2]} ${c[3]},${c[4]} ${c[5]},${c[6]}` : `${c[0]}${c[1]},${c[2]}`))
      .join(" ") + " Z"
  );
}

export function neighborsOf(g: Geometry, idx: number): number[] {
  const r = rowOf(g, idx);
  const c = colOf(g, idx);
  const out: number[] = [];
  if (r > 0) out.push(indexOf(g, r - 1, c));
  if (c < g.cols - 1) out.push(indexOf(g, r, c + 1));
  if (r < g.rows - 1) out.push(indexOf(g, r + 1, c));
  if (c > 0) out.push(indexOf(g, r, c - 1));
  return out;
}
