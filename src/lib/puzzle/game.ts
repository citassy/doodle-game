import { autoSnap, canManualSnap, isSolved, manualSnap } from "./snap";
import { centroid, rotateAbout, translate } from "./moves";
import { generateEdges, homeOf, type Edges } from "./shapes";
import { UnionFind } from "./unionFind";
import type { Geometry, PieceRow, PieceState } from "./types";

export interface Change {
  /** Rows to save and broadcast. */
  rows: PieceRow[];
  merged: number;
  solved: boolean;
}

export const EMPTY_CHANGE: Change = { rows: [], merged: 0, solved: false };

/**
 * All of the puzzle rules in one place, with no React and no DOM, so it can be
 * tested in plain Node. The board component only forwards pointer and keyboard
 * input to this class and draws whatever state it holds.
 */
export class PuzzleGame {
  readonly g: Geometry;
  readonly edges: Edges;
  readonly pieces: PieceState[];
  readonly uf: UnionFind;
  /** Draw order. Higher is on top. */
  readonly z: Int32Array;
  autoSnapOn: boolean;

  private selection = new Set<number>();
  private dragging: number[] = [];
  private zTop: number;
  private version = 0;

  constructor(g: Geometry, rows: PieceRow[], autoSnapOn: boolean) {
    this.g = g;
    this.edges = generateEdges(g);
    this.autoSnapOn = autoSnapOn;
    this.pieces = Array.from({ length: g.count }, () => ({ x: 0, y: 0, rot: 0 }));
    this.uf = new UnionFind(g.count);
    this.z = new Int32Array(g.count);
    for (let i = 0; i < g.count; i++) this.z[i] = i;
    this.zTop = g.count;
    this.loadRows(rows);
  }

  // ------------------------------------------------------------- reading --
  /** Bumps on every change so a renderer can tell when to redraw. */
  get rev(): number {
    return this.version;
  }

  get solved(): boolean {
    return isSolved(this.uf);
  }

  get clusterCount(): number {
    return this.uf.count;
  }

  isSelected(idx: number): boolean {
    return this.selection.has(this.uf.find(idx));
  }

  /** Every piece in every selected cluster. */
  selectedPieces(): number[] {
    if (this.selection.size === 0) return [];
    const out: number[] = [];
    for (let i = 0; i < this.g.count; i++) if (this.selection.has(this.uf.find(i))) out.push(i);
    return out;
  }

  get selectedClusterCount(): number {
    return this.selection.size;
  }

  get canSnap(): boolean {
    return canManualSnap(this.uf, this.selectedPieces());
  }

  get isDragging(): boolean {
    return this.dragging.length > 0;
  }

  clusterMembers(idx: number): number[] {
    return this.uf.membersOf(this.uf.find(idx));
  }

  rowFor(idx: number): PieceRow {
    const p = this.pieces[idx];
    return { idx, x: p.x, y: p.y, rot: p.rot, cluster: this.uf.find(idx) };
  }

  allRows(): PieceRow[] {
    return Array.from({ length: this.g.count }, (_, i) => this.rowFor(i));
  }

  // ----------------------------------------------------------- selecting --
  clearSelection() {
    if (this.selection.size === 0) return;
    this.selection.clear();
    this.version++;
  }

  /** Click on a piece. Without `additive` the piece's cluster becomes the only selection. */
  clickPiece(idx: number, additive: boolean) {
    const root = this.uf.find(idx);
    if (additive) {
      if (this.selection.has(root)) this.selection.delete(root);
      else this.selection.add(root);
    } else if (!(this.selection.size === 1 && this.selection.has(root))) {
      if (!this.selection.has(root)) this.selection.clear();
      this.selection.add(root);
    }
    this.version++;
  }

  /** Rubber-band: select every cluster with a piece centre inside the rectangle. */
  selectRect(x0: number, y0: number, x1: number, y1: number, additive: boolean, base?: Set<number>) {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    const next = new Set<number>(additive && base ? base : []);
    for (let i = 0; i < this.g.count; i++) {
      const p = this.pieces[i];
      if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) next.add(this.uf.find(i));
    }
    this.selection = next;
    this.version++;
  }

  snapshotSelection(): Set<number> {
    return new Set(this.selection);
  }

  // ------------------------------------------------------------ dragging --
  /**
   * Starts dragging from a piece. If the piece is already part of the
   * selection the whole selection moves together, otherwise it becomes the
   * selection first.
   */
  beginDrag(idx: number, additive: boolean) {
    const root = this.uf.find(idx);
    if (!this.selection.has(root)) {
      if (!additive) this.selection.clear();
      this.selection.add(root);
    }
    this.dragging = this.selectedPieces();
    this.raise(this.dragging);
    this.version++;
  }

  dragBy(dx: number, dy: number) {
    if (this.dragging.length === 0) return;
    translate(this.pieces, this.dragging, dx, dy);
    this.version++;
  }

  /** Positions of what is being dragged, for the live broadcast. */
  draggedPositions(): Array<{ i: number; x: number; y: number }> {
    return this.dragging.map((i) => ({ i, x: this.pieces[i].x, y: this.pieces[i].y }));
  }

  /** Positions to broadcast live: what is being dragged, or the selection while nudging. */
  livePositions(): Array<{ i: number; x: number; y: number }> {
    const idxs = this.dragging.length ? this.dragging : this.selectedPieces();
    return idxs.map((i) => ({ i, x: this.pieces[i].x, y: this.pieces[i].y }));
  }

  endDrag(): Change {
    const dropped = this.dragging;
    this.dragging = [];
    if (dropped.length === 0) return EMPTY_CHANGE;
    return this.settle(dropped);
  }

  cancelDrag() {
    this.dragging = [];
  }

  // ------------------------------------------------- selection commands --
  rotateSelection(dir: 1 | -1): Change {
    const idxs = this.selectedPieces();
    if (idxs.length === 0) return EMPTY_CHANGE;
    rotateAbout(this.pieces, idxs, centroid(this.pieces, idxs), dir);
    this.version++;
    return this.settle(idxs);
  }

  /** Arrow-key nudge. Always available, whatever the snap mode. */
  nudgeSelection(dx: number, dy: number, settle: boolean): Change {
    const idxs = this.selectedPieces();
    if (idxs.length === 0) return EMPTY_CHANGE;
    translate(this.pieces, idxs, dx, dy);
    this.version++;
    return settle ? this.settle(idxs) : EMPTY_CHANGE;
  }

  /** Commit the nudges made so far (called after the keys have been quiet for a moment). */
  settleSelection(): Change {
    return this.settle(this.selectedPieces());
  }

  /** The Snap button (manual mode). */
  snapSelection(): Change {
    const idxs = this.selectedPieces();
    if (idxs.length === 0) return EMPTY_CHANGE;
    const merges = manualSnap(this.g, this.pieces, this.uf, idxs);
    this.version++;
    return this.finish(idxs, merges.length);
  }

  // ---------------------------------------------------------- remote side --
  /** Another player is mid-drag. Pure display, never saved. */
  applyRemoteDrag(items: Array<{ i: number; x: number; y: number }>) {
    for (const it of items) {
      const p = this.pieces[it.i];
      if (!p) continue;
      p.x = it.x;
      p.y = it.y;
    }
    this.raise(items.map((it) => it.i));
    this.version++;
  }

  /** Another player dropped, rotated or snapped. */
  applyRemoteRows(rows: PieceRow[]) {
    this.loadRows(rows);
    this.raise(rows.map((r) => r.idx));
    this.version++;
  }

  setAutoSnap(on: boolean) {
    this.autoSnapOn = on;
    this.version++;
  }

  // ------------------------------------------------------------- private --
  private loadRows(rows: PieceRow[]) {
    for (const r of rows) {
      const p = this.pieces[r.idx];
      if (!p) continue;
      p.x = r.x;
      p.y = r.y;
      p.rot = r.rot;
    }
    // Pieces only ever join, never split, so merging is enough to replay a save.
    for (const r of rows) if (r.cluster !== r.idx) this.uf.union(r.idx, r.cluster);
    // Selection is keyed by cluster root, which can change after a merge.
    const sel = [...this.selection];
    this.selection.clear();
    for (const s of sel) this.selection.add(this.uf.find(s));
  }

  private raise(idxs: number[]) {
    for (const i of idxs) this.z[i] = ++this.zTop;
  }

  /** After something moved: snap if allowed, and work out what needs saving. */
  private settle(moved: number[]): Change {
    let merged = 0;
    if (this.autoSnapOn) merged = autoSnap(this.g, this.pieces, this.uf, moved).length;
    this.version++;
    return this.finish(moved, merged);
  }

  private finish(moved: number[], merged: number): Change {
    const roots = new Set<number>();
    for (const i of moved) roots.add(this.uf.find(i));
    // Re-key the selection, then save every piece in each touched cluster
    // (a merge can change another cluster's id and move this one).
    const sel = [...this.selection];
    this.selection.clear();
    for (const s of sel) this.selection.add(this.uf.find(s));

    const rows: PieceRow[] = [];
    for (let i = 0; i < this.g.count; i++) {
      if (roots.has(this.uf.find(i))) rows.push(this.rowFor(i));
    }
    return { rows, merged, solved: this.solved };
  }
}

/** Rows for a fresh, scattered board. */
export function rowsFromPieces(pieces: PieceState[]): PieceRow[] {
  return pieces.map((p, idx) => ({ idx, x: p.x, y: p.y, rot: p.rot, cluster: idx }));
}

export function boundsOfPieces(g: Geometry, pieces: PieceState[]) {
  let minX = -g.width / 2;
  let maxX = g.width / 2;
  let minY = -g.height / 2;
  let maxY = g.height / 2;
  const r = Math.max(g.cw, g.ch) * 0.6;
  for (const p of pieces) {
    if (p.x - r < minX) minX = p.x - r;
    if (p.x + r > maxX) maxX = p.x + r;
    if (p.y - r < minY) minY = p.y - r;
    if (p.y + r > maxY) maxY = p.y + r;
  }
  return { minX, minY, maxX, maxY };
}

export { homeOf };
