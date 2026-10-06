"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import type { BoardHandle } from "./BoardCanvas";
import { sampleAt, type CursorTrack } from "@/lib/puzzle/cursorTrack";

export interface CursorPerson {
  id: string;
  name: string;
  color: string;
}

// How far behind "now" the cursors are drawn. It has to be a bit more than the sender's batch interval, so there is
// always a next position to move towards. Lower = snappier but jumpier; higher = smoother but later.
const DELAY_MS = 130;
const IDLE_HIDE_MS = 6000;

const inkFor = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 165 ? "#4A2F2F" : "#fff";
};

/**
 * Other people's mouse pointers, drawn over the board. Positions are shared in board coordinates and turned into
 * screen coordinates every frame, so a cursor stays on the same spot of the puzzle however each person zooms or pans.
 * The size follows the screen width (like a real pointer would look on that screen), not the puzzle zoom.
 */
export function RemoteCursors({
  people,
  pointers,
  handleRef,
  showNames,
}: {
  people: CursorPerson[];
  pointers: MutableRefObject<Map<string, CursorTrack>>;
  handleRef: MutableRefObject<BoardHandle | null>;
  showNames: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    let raf = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const wrap = wrapRef.current;
      const handle = handleRef.current;
      if (!wrap || !handle) return;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      for (const [id, el] of els.current) {
        const track = pointers.current.get(id);
        const at = track ? sampleAt(track, t - DELAY_MS, t, IDLE_HIDE_MS) : null;
        if (!at) {
          el.style.opacity = "0";
          continue;
        }
        const p = handle.worldToScreen(at.x, at.y);
        const inside = p.x > -20 && p.y > -20 && p.x < w + 20 && p.y < h + 20;
        el.style.transform = `translate3d(${p.x}px,${p.y}px,0)`;
        el.style.opacity = inside ? "1" : "0";
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [pointers, handleRef]);

  return (
    <div ref={wrapRef} className="rc-wrap" aria-hidden="true">
      <style>{CSS}</style>
      {people.map((p) => (
        <div
          key={p.id}
          className="rc-cur"
          ref={(el) => {
            if (el) els.current.set(p.id, el);
            else els.current.delete(p.id);
          }}
        >
          <svg viewBox="0 0 24 24">
            <path d="M3.5 3.5l16 7-7 2.5-2.5 7z" fill={p.color} stroke="#fff" strokeWidth="3.4" strokeLinejoin="round" paintOrder="stroke" />
          </svg>
          {showNames && <span style={{ background: p.color, color: inkFor(p.color) }}>{p.name}</span>}
        </div>
      ))}
    </div>
  );
}

const CSS = `
.rc-wrap{position:absolute;inset:0;z-index:10;pointer-events:none;overflow:hidden}
.rc-cur{position:absolute;left:0;top:0;display:flex;align-items:flex-start;opacity:0;transition:opacity .2s;will-change:transform;font-size:clamp(10px,.55vw + 6.5px,15px)}
.rc-cur svg{width:1.8em;height:1.8em;flex:none;margin:-.26em 0 0 -.26em}
.rc-cur span{margin:.7em 0 0 -.45em;max-width:12em;overflow:hidden;text-overflow:ellipsis;font-family:var(--font-fredoka),ui-rounded,system-ui,sans-serif;font-weight:600;line-height:1;padding:.36em .8em .45em;border-radius:999px;white-space:nowrap;box-shadow:0 0 0 1.5px #fff}
@media (prefers-reduced-motion:reduce){.rc-cur{transition:none}}
`;