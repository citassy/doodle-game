export type AspectId = "1:1" | "4:3" | "3:4" | "16:9" | "9:16" | "3:2" | "2:3";
export type PuzzleMode = "coop" | "competition";

/** One piece: where its cell centre sits in world units, and how it is turned. */
export interface PieceState {
  x: number;
  y: number;
  /** Quarter turns clockwise, 0..3. */
  rot: number;
}

/** A piece row as stored in the database. */
export interface PieceRow extends PieceState {
  idx: number;
  cluster: number;
}

export interface Vec {
  x: number;
  y: number;
}

export type PathCmd =
  | ["M", number, number]
  | ["L", number, number]
  | ["C", number, number, number, number, number, number];

export interface Geometry {
  seed: number;
  cols: number;
  rows: number;
  /** Cell size in world units. */
  cw: number;
  ch: number;
  /** Whole-puzzle size in world units. The puzzle is centred on (0, 0). */
  width: number;
  height: number;
  count: number;
}
