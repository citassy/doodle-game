import type { PieceRow } from "./types";

/** Everything that travels over the board's Realtime broadcast channel. */
export interface DragMsg {
  from: string;
  color: string;
  items: Array<{ i: number; x: number; y: number }>;
}

export interface RowsMsg {
  from: string;
  color: string;
  rows: PieceRow[];
  solved: boolean;
  elapsed: number;
}

export interface TimeMsg {
  from: string;
  elapsed: number;
}

/**
 * A short batch of someone's recent pointer positions, in board coordinates (so they follow zoom and pan), oldest first.
 * `t` is how many milliseconds before the message was sent each position happened, so no shared clock is needed.
 * x/y null = the pointer left the board.
 */
export interface CursorMsg {
  from: string;
  pts: Array<{ x: number | null; y: number | null; t: number }>;
}

export interface PresenceMember {
  clientId: string;
  name: string;
  color: string;
  /** Seconds this person has spent in the room (on their device) and how many times they joined pieces together. */
  secs?: number;
  joins?: number;
}

export const EVENTS = {
  drag: "drag",
  rows: "rows",
  time: "time",
  cursor: "cursor",
} as const;