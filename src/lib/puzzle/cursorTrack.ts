/**
 * Smooth playback of someone else's pointer.
 *
 * The sender batches its recent positions, each with how long ago it happened. The receiver turns that into its own
 * timeline and draws the cursor a little in the past, between two known positions, so motion stays smooth even when
 * messages arrive late, early or in a bunch.
 */
export interface Sample {
  /** Board coordinates, or null when the pointer left the board. */
  x: number | null;
  y: number | null;
  /** On the receiver's clock (performance.now), in ms. */
  at: number;
}

export interface CursorTrack {
  samples: Sample[];
}

const MAX_SAMPLES = 60;

export function pushSamples(track: CursorTrack, incoming: Sample[]) {
  track.samples.push(...incoming);
  track.samples.sort((a, b) => a.at - b.at); // batches can arrive out of order
  if (track.samples.length > MAX_SAMPLES) track.samples.splice(0, track.samples.length - MAX_SAMPLES);
}

/** Where to draw the cursor at render time `rt`, or null to hide it. Drops samples that are no longer needed. */
export function sampleAt(track: CursorTrack, rt: number, now: number, idleMs: number): { x: number; y: number } | null {
  const s = track.samples;
  if (s.length === 0) return null;
  if (now - s[s.length - 1].at > idleMs) return null;
  while (s.length >= 2 && s[1].at <= rt) s.shift();
  const a = s[0];
  const b = s[1];
  if (a.x === null || a.y === null) return null;
  // no next point yet (or it is a "left the board" marker): hold still rather than guess
  if (!b || rt <= a.at || b.x === null || b.y === null) return { x: a.x, y: a.y };
  const k = Math.min(1, Math.max(0, (rt - a.at) / (b.at - a.at || 1)));
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}