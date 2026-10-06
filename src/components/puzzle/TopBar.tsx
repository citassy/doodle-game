"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { formatStay } from "@/lib/puzzle/stats";
import { Chevron, formatTime, GearIcon, HourglassIcon, PieceGlyph, PtAvatar } from "./ui";

export interface BarPlayer {
  id: string;
  name: string;
  color: string;
  online: boolean;
  /** Seconds in the room and joins made, as the person last shared them (only while they are here). */
  secs?: number;
  joins?: number;
}

/** An avatar that shows a little card on hover (or focus, or tap). The card is drawn outside the bar so it isn't clipped. */
function AvatarTip({ pl }: { pl: BarPlayer }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const show = () => ref.current && setRect(ref.current.getBoundingClientRect());
  const hide = () => setRect(null);
  const hasStats = pl.online && pl.secs !== undefined && pl.joins !== undefined;
  const left = rect ? Math.min(Math.max(rect.left + rect.width / 2, 100), window.innerWidth - 100) : 0;
  return (
    <span
      ref={ref}
      tabIndex={0}
      aria-label={pl.online ? pl.name : `${pl.name} (away)`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onClick={() => (rect ? hide() : show())}
      className="inline-flex rounded-full cursor-default outline-none focus-visible:ring-2 focus-visible:ring-pt-accent/50"
    >
      <PtAvatar name={pl.name} color={pl.color} dim={!pl.online} />
      {rect &&
        createPortal(
          <div
            role="tooltip"
            style={{ position: "fixed", left, top: rect.bottom + 10, transform: "translateX(-50%)" }}
            className="z-50 pointer-events-none w-max max-w-[220px] rounded-2xl bg-pt-surface border-2 border-pt-line px-4 py-3 text-left shadow-[0_3px_0_var(--pt-line),0_10px_22px_rgba(90,58,58,0.12)]"
          >
            <div className="flex items-center gap-2 font-medium text-[15px] text-pt-ink">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: pl.online ? "#8A9A6B" : "#C9B8B2" }} />
              <span className="truncate">{pl.name}</span>
            </div>
            {hasStats ? (
              <dl className="mt-2 grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-[13px]">
                <dt className="text-pt-muted">In the room</dt>
                <dd className="text-pt-ink tabular-nums text-right">{formatStay(pl.secs!)}</dd>
                <dt className="text-pt-muted">Joins made</dt>
                <dd className="text-pt-ink tabular-nums text-right">{pl.joins}</dd>
              </dl>
            ) : (
              <div className="mt-1 text-[13px] text-pt-muted">{pl.online ? "Here now" : "Away right now"}</div>
            )}
          </div>,
          document.body
        )}
    </span>
  );
}

interface Props {
  code: string;
  elapsed: number;
  solved: boolean;
  players: BarPlayer[];
  onOpenSettings: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  /** Fades the bar while a piece is being dragged so it never gets in the way. */
  dimmed: boolean;
}

const spring = { type: "spring", stiffness: 420, damping: 38, mass: 0.9 } as const;

export function TopBar(p: Props) {
  const [copied, setCopied] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [openW, setOpenW] = useState(0);
  const [closedW, setClosedW] = useState(0);
  const timeText = formatTime(p.elapsed);

  // The bar's width is animated as a real width (not a scale), so the text and
  // round shapes inside never stretch while it opens and closes.
  useLayoutEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;
    const update = () => setOpenW(parent.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (measureRef.current) setClosedW(Math.ceil(measureRef.current.getBoundingClientRect().width) + 4);
  }, [timeText, copied, p.solved]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(p.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard can be blocked; the code is still on screen */
    }
  }

  const shown = p.players.slice(0, 4);
  const extra = p.players.length - shown.length;

  const timer = (
    <motion.div
      layoutId="pt-timer"
      transition={spring}
      className="inline-flex items-center gap-1.5 rounded-full bg-pt-chip px-3.5 h-9 text-[15px] font-medium tabular-nums text-pt-ink"
      aria-label={p.solved ? "Solved in" : "Time"}
      style={{ borderRadius: 999 }}
    >
      <span className="text-pt-muted">
        <HourglassIcon size={13} />
      </span>
      {timeText}
    </motion.div>
  );

  const code = (
    <motion.button
      layoutId="pt-code"
      transition={spring}
      onClick={copyCode}
      title="Copy room code"
      aria-label={`Room code ${p.code}. Copy room code`}
      className="relative inline-flex items-center rounded-full bg-pt-chip px-3.5 h-9 text-[14px] font-medium tracking-[0.12em] text-pt-muted hover:bg-pt-line cursor-pointer"
      style={{ borderRadius: 999 }}
    >
      {copied ? <span className="tracking-normal text-pt-accent">Code copied</span> : p.code}
    </motion.button>
  );

  const toggle = (
    <motion.button
      layoutId="pt-toggle"
      transition={spring}
      onClick={p.onToggleExpanded}
      aria-label={p.expanded ? "Hide top bar" : "Show top bar"}
      aria-expanded={p.expanded}
      className="w-11 h-11 rounded-full bg-pt-chip text-pt-ink flex items-center justify-center hover:bg-pt-line cursor-pointer flex-shrink-0"
      style={{ borderRadius: 999 }}
    >
      {/* points the way the bar moves: left to tuck away, right to open */}
      <motion.span
        className="flex"
        initial={false}
        animate={{ rotate: p.expanded ? 0 : 180 }}
        transition={spring}
      >
        <Chevron dir="left" />
      </motion.span>
    </motion.button>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div ref={parentRef} className="fixed top-3 left-3 right-3 z-30 pointer-events-none flex justify-start">
        {/* invisible copy of the collapsed bar, only to measure how wide it needs to be */}
        <div
          ref={measureRef}
          aria-hidden="true"
          className="absolute invisible pointer-events-none flex items-center gap-2 pl-2 pr-1.5 h-14 w-max"
        >
          <span className="px-3.5 text-[14px] font-medium tracking-[0.12em]">{copied ? "Code copied" : p.code}</span>
          <span className="inline-flex items-center gap-1.5 px-3.5 text-[15px] font-medium tabular-nums">
            <span className="w-[13px]" />
            {timeText}
          </span>
          <span className="w-11" />
        </div>
        <motion.header
          initial={false}
          animate={{
            opacity: p.dimmed ? 0.3 : 1,
            width: p.expanded ? (openW || "100%") : closedW || "auto",
          }}
          transition={{ ...spring, opacity: { duration: 0.15 } }}
          style={{ borderRadius: 999 }}
          className={`relative pointer-events-auto bg-pt-surface border-2 border-pt-line shadow-[0_3px_0_var(--pt-line),0_10px_22px_rgba(90,58,58,0.06)] overflow-hidden ${
            p.dimmed ? "!pointer-events-none" : ""
          }`}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {p.expanded ? (
              <motion.div
                key="open"
                className="flex items-center justify-between gap-3 pl-3 pr-1.5 h-14 min-w-[320px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Link
                    href="/"
                    aria-label="Back to all games"
                    className="w-10 h-10 rounded-full bg-pt-accent flex items-center justify-center flex-shrink-0"
                  >
                    <PieceGlyph size={22} />
                  </Link>
                  <span className="hidden sm:inline text-lg font-medium truncate">Puzzle Together</span>
                  {code}
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  {[
                    <div key="timer">{timer}</div>,
                    <button
                      key="settings"
                      onClick={p.onOpenSettings}
                      aria-label="Settings"
                      title="Settings"
                      className="inline-flex items-center justify-center rounded-full bg-pt-chip w-9 h-9 text-pt-ink hover:bg-pt-line cursor-pointer"
                    >
                      <GearIcon />
                    </button>,
                    <div key="people" className="flex items-center pl-1" aria-label={`${p.players.filter((x) => x.online).length} people here`}>
                      {shown.map((pl, i) => (
                        <span key={pl.id} style={{ marginLeft: i === 0 ? 0 : -10 }}>
                          <AvatarTip pl={pl} />
                        </span>
                      ))}
                      {extra > 0 && (
                        <span className="ml-1 text-[13px] text-pt-muted">+{extra}</span>
                      )}
                    </div>,
                  ].map((node, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.06 + i * 0.045, duration: 0.2 }}
                    >
                      {node}
                    </motion.div>
                  ))}
                  {toggle}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="closed"
                className="flex items-center gap-2 pl-2 pr-1.5 h-14"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
              >
                {code}
                {timer}
                {toggle}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.header>
      </div>
    </MotionConfig>
  );
}