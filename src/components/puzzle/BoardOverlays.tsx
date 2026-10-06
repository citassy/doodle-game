"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { formatTime, HourglassIcon, PtAvatar, PtButton, PtModal } from "./ui";
import type { BoardUi } from "./BoardCanvas";
import type { BarPlayer } from "./TopBar";

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function SelectionToolbar({
  ui,
  onRotate,
  onClear,
  area,
}: {
  ui: BoardUi;
  onRotate: (dir: 1 | -1) => void;
  onClear: () => void;
  area: { w: number; h: number };
}) {
  const r = ui.selRect;
  const show = !!r && ui.selectedCount > 0 && !ui.dragging;
  let left = 0;
  let top = 0;
  if (r) {
    const W = 232;
    left = Math.min(Math.max(8, (r.x0 + r.x1) / 2 - W / 2), Math.max(8, area.w - W - 8));
    top = r.y0 - 64;
    if (top < 76) top = Math.min(r.y1 + 14, area.h - 130);
  }
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="sel"
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 500, damping: 34 }}
          style={{ left, top, borderRadius: 999 }}
          className="absolute z-20 flex items-center gap-1 pl-4 pr-1.5 h-12 bg-pt-surface border-2 border-pt-line shadow-[0_3px_0_var(--pt-line),0_10px_22px_rgba(90,58,58,0.1)]"
          role="toolbar"
          aria-label="Selection"
        >
          <span className="text-sm text-pt-muted mr-1 whitespace-nowrap">{ui.selectedCount} selected</span>
          <button onClick={() => onRotate(-1)} aria-label="Turn left" title="Turn left (Q)" className="w-11 h-11 rounded-full flex items-center justify-center text-pt-ink hover:bg-pt-chip cursor-pointer">
            <svg {...iconProps}>
              <path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" />
            </svg>
          </button>
          <button onClick={() => onRotate(1)} aria-label="Turn right" title="Turn right (R)" className="w-11 h-11 rounded-full flex items-center justify-center text-pt-ink hover:bg-pt-chip cursor-pointer">
            <svg {...iconProps}>
              <path d="M20 12a8 8 0 1 1-3-6.2M20 4v4h-4" />
            </svg>
          </button>
          <button onClick={onClear} className="h-11 px-3 rounded-full text-sm text-pt-muted hover:bg-pt-chip cursor-pointer">
            Clear
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SnapButton({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      title={enabled ? "Join the pieces that fit" : "Select two or more groups of pieces to snap them"}
      className="absolute right-5 bottom-5 z-20 h-12 px-7 rounded-full text-base font-medium cursor-pointer transition active:scale-[0.96] bg-pt-accent text-white shadow-[0_6px_14px_rgba(190,85,96,0.3),inset_0_-3px_0_rgba(0,0,0,0.12)] disabled:cursor-not-allowed disabled:bg-pt-line disabled:text-pt-muted disabled:shadow-none"
    >
      Snap
    </button>
  );
}

export function ZoomPill({ zoom, onZoom, onFit }: { zoom: number; onZoom: (f: number) => void; onFit: () => void }) {
  const btn = "w-11 h-11 rounded-full flex items-center justify-center text-pt-ink hover:bg-pt-chip cursor-pointer text-xl leading-none";
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 bottom-5 z-20 flex items-center gap-0.5 px-1.5 h-12 rounded-full bg-pt-surface border-2 border-pt-line shadow-[0_3px_0_var(--pt-line)]"
      role="group"
      aria-label="Zoom"
    >
      <button className={btn} onClick={() => onZoom(1 / 1.25)} aria-label="Zoom out">
        −
      </button>
      <span className="w-12 text-center text-sm tabular-nums text-pt-muted">{Math.round(zoom * 100)}%</span>
      <button className={btn} onClick={() => onZoom(1.25)} aria-label="Zoom in">
        +
      </button>
      <button className="h-11 px-3 rounded-full text-sm text-pt-ink hover:bg-pt-chip cursor-pointer" onClick={onFit} title="See everything (F)">
        Fit
      </button>
    </div>
  );
}

export function Thumbnail({ src, aspect, onClick }: { src: string; aspect: number; onClick: () => void }) {
  const w = 112;
  return (
    <button
      onClick={onClick}
      aria-label="Look at the picture"
      title="Look at the picture"
      className="absolute left-5 bottom-5 z-20 border-[5px] border-pt-surface shadow-[0_6px_16px_rgba(90,58,58,0.18)] overflow-hidden cursor-pointer transition hover:scale-[1.03]"
      style={{ width: w, height: w / aspect }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- remote puzzle picture */}
      <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
    </button>
  );
}

export function PictureLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <PtModal onClose={onClose} wide>
      <h2 className="text-xl font-medium pr-12 mb-4">The picture</h2>
      {/* eslint-disable-next-line @next/next/no-img-element -- remote puzzle picture */}
      <img src={src} alt="The finished puzzle picture" className="w-full max-h-[70vh] object-contain" />
    </PtModal>
  );
}

export function SolvedCard({
  elapsed,
  players,
  onLook,
}: {
  elapsed: number;
  players: BarPlayer[];
  onLook: () => void;
}) {
  return (
    <motion.div
      className="absolute inset-0 z-30 flex items-center justify-center p-5 bg-pt-ink/20 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ scale: 0.88, y: 18 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        className="w-full max-w-md rounded-[32px] bg-pt-surface border-2 border-pt-line p-8 text-center shadow-[0_10px_0_var(--pt-line),0_30px_60px_rgba(90,58,58,0.18)]"
        role="dialog"
        aria-label="Puzzle solved"
      >
        <h2 className="text-3xl font-medium">Puzzle solved</h2>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-pt-chip px-4 h-10 text-xl font-medium tabular-nums">
          <span className="text-pt-muted">
            <HourglassIcon size={16} />
          </span>
          {formatTime(elapsed)}
        </div>
        <div className="mt-5 flex justify-center">
          {players.slice(0, 8).map((pl, i) => (
            <span key={pl.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
              <PtAvatar name={pl.name} color={pl.color} size={40} />
            </span>
          ))}
        </div>
        <p className="mt-4 text-pt-muted text-[15px]">You built it together.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <PtButton variant="secondary" onClick={onLook}>
            Look at the picture
          </PtButton>
          <Link
            href="/puzzle-together/new"
            className="h-12 px-7 rounded-full inline-flex items-center justify-center text-base font-medium bg-pt-accent text-white shadow-[0_6px_14px_rgba(190,85,96,0.3),inset_0_-3px_0_rgba(0,0,0,0.12)] transition active:scale-[0.97]"
          >
            New puzzle
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
