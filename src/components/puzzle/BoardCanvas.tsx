"use client";

import { useEffect, useRef } from "react";
import type { PuzzleGame, Change } from "@/lib/puzzle/game";
import { BoardRenderer } from "@/lib/puzzle/renderer";

export interface BoardHandle {
  fit: () => void;
  fitGuide: () => void;
  zoomBy: (factor: number) => void;
  rotate: (dir: 1 | -1) => void;
  snap: () => void;
  clearSelection: () => void;
  setShowGuide: (on: boolean) => void;
  setRemoteHeld: (held: Map<number, string>) => void;
  invalidate: () => void;
  /** For tests and tooling: where a world point is on screen. */
  worldToScreen: (x: number, y: number) => { x: number; y: number };
}

export interface BoardUi {
  zoom: number;
  selectedCount: number;
  canSnap: boolean;
  /** Screen box around the selection, null when nothing is selected. */
  selRect: { x0: number; y0: number; x1: number; y1: number } | null;
  dragging: boolean;
}

interface Props {
  game: PuzzleGame;
  image: HTMLImageElement | null;
  onCommit: (change: Change) => void;
  /** Called a few times a second while dragging (live broadcast). */
  onLiveDrag: () => void;
  onUi: (ui: BoardUi) => void;
  onReady: (handle: BoardHandle) => void;
  /** Where the pointer is on the board (board coordinates), or null when it leaves. Used to share cursors. */
  onPointer?: (world: { x: number; y: number } | null) => void;
  /** True while the page has a modal open, so keys don't move pieces. */
  paused?: boolean;
}

const NUDGE_SETTLE_MS = 450;
const LIVE_MS = 50;

export function BoardCanvas({ game, image, onCommit, onLiveDrag, onUi, onReady, onPointer, paused }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<BoardRenderer | null>(null);
  const cbRef = useRef({ onCommit, onLiveDrag, onUi, onPointer, paused });
  useEffect(() => {
    cbRef.current = { onCommit, onLiveDrag, onUi, onPointer, paused };
  });

  useEffect(() => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    let lastUi = "";

    const emitUi = () => {
      const r = rendererRef.current;
      if (!r) return;
      const rect = r.selectionScreenRect();
      const ui: BoardUi = {
        zoom: r.camera.zoom,
        selectedCount: game.selectedPieces().length,
        canSnap: game.canSnap,
        selRect: rect,
        dragging: game.isDragging,
      };
      const key = JSON.stringify([
        Math.round(ui.zoom * 1000),
        ui.selectedCount,
        ui.canSnap,
        ui.dragging,
        rect && [Math.round(rect.x0), Math.round(rect.y0), Math.round(rect.x1), Math.round(rect.y1)],
      ]);
      if (key !== lastUi) {
        lastUi = key;
        cbRef.current.onUi(ui);
      }
    };

    const renderer = new BoardRenderer(canvas, game, emitUi);
    rendererRef.current = renderer;

    const resize = () => {
      const b = wrap.getBoundingClientRect();
      const first = renderer.width <= 1;
      renderer.resize(b.width, b.height, window.devicePixelRatio || 1);
      if (first) renderer.fit();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // ---------------------------------------------------------- handle --
    let nudgeTimer: ReturnType<typeof setTimeout> | null = null;
    const flushNudge = () => {
      if (nudgeTimer) {
        clearTimeout(nudgeTimer);
        nudgeTimer = null;
        cbRef.current.onCommit(game.settleSelection());
      }
    };

    const handle: BoardHandle = {
      fit: () => renderer.fit(),
      fitGuide: () => renderer.fitGuide(),
      zoomBy: (f) => renderer.zoomCentered(f),
      rotate: (dir) => {
        flushNudge();
        cbRef.current.onCommit(game.rotateSelection(dir));
        renderer.invalidate();
      },
      snap: () => {
        flushNudge();
        cbRef.current.onCommit(game.snapSelection());
        renderer.invalidate();
      },
      clearSelection: () => {
        game.clearSelection();
        renderer.invalidate();
      },
      setShowGuide: (on) => {
        renderer.showGuide = on;
        renderer.invalidate();
      },
      setRemoteHeld: (held) => {
        renderer.remoteHeld = held;
        renderer.invalidate();
      },
      invalidate: () => renderer.invalidate(),
      worldToScreen: (x, y) => renderer.worldToScreen(x, y),
    };
    onReady(handle);

    // --------------------------------------------------------- pointers --
    type Mode = "none" | "drag" | "marquee" | "pan" | "pinch";
    let mode: Mode = "none";
    const pointers = new Map<number, { x: number; y: number }>();
    let last = { x: 0, y: 0 };
    let moved = false;
    let additive = false;
    let marqueeStart = { x: 0, y: 0 };
    let marqueeBase = new Set<number>();
    let spaceDown = false;
    let pinchDist = 0;
    let pinchCenter = { x: 0, y: 0 };
    let liveTimer: ReturnType<typeof setTimeout> | null = null;

    const local = (e: PointerEvent | WheelEvent) => {
      const b = canvas.getBoundingClientRect();
      return { x: e.clientX - b.left, y: e.clientY - b.top };
    };

    const sendLive = () => {
      if (liveTimer) return;
      liveTimer = setTimeout(() => {
        liveTimer = null;
        cbRef.current.onLiveDrag();
      }, LIVE_MS);
    };

    const finishDrag = () => {
      if (liveTimer) {
        clearTimeout(liveTimer);
        liveTimer = null;
      }
      if (moved) cbRef.current.onCommit(game.endDrag());
      else game.cancelDrag();
      renderer.invalidate();
    };

    const onDown = (e: PointerEvent) => {
      if (cbRef.current.paused) return;
      canvas.setPointerCapture(e.pointerId);
      const p = local(e);
      pointers.set(e.pointerId, p);
      flushNudge();

      if (pointers.size === 2) {
        if (mode === "drag") finishDrag();
        renderer.marquee = null;
        mode = "pinch";
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        pinchCenter = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        return;
      }

      last = p;
      moved = false;
      additive = e.shiftKey || e.metaKey || e.ctrlKey;
      if (e.button === 1 || e.button === 2 || spaceDown) {
        mode = "pan";
        return;
      }
      const world = renderer.screenToWorld(p.x, p.y);
      const hit = renderer.hitTest(world);
      if (hit >= 0) {
        if (additive) {
          game.clickPiece(hit, true);
          if (!game.isSelected(hit)) {
            mode = "none";
            renderer.invalidate();
            return;
          }
        }
        game.beginDrag(hit, additive);
        mode = "drag";
      } else if (e.pointerType === "touch") {
        mode = "pan";
      } else {
        mode = "marquee";
        marqueeStart = world;
        marqueeBase = additive ? game.snapshotSelection() : new Set();
        if (!additive) game.clearSelection();
      }
      renderer.invalidate();
    };

    const onMove = (e: PointerEvent) => {
      const p = local(e);
      cbRef.current.onPointer?.(renderer.screenToWorld(p.x, p.y));
      if (!pointers.has(e.pointerId)) {
        // hovering: show a grab cursor over pieces
        if (!cbRef.current.paused) {
          canvas.style.cursor = spaceDown ? "grab" : renderer.hitTest(renderer.screenToWorld(p.x, p.y)) >= 0 ? "grab" : "default";
        }
        return;
      }
      pointers.set(e.pointerId, p);
      const dx = p.x - last.x;
      const dy = p.y - last.y;

      if (mode === "pinch" && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        renderer.panBy(center.x - pinchCenter.x, center.y - pinchCenter.y);
        renderer.zoomAt(center.x, center.y, dist / pinchDist);
        pinchDist = dist;
        pinchCenter = center;
        return;
      }

      if (Math.abs(p.x - last.x) + Math.abs(p.y - last.y) > 0) {
        if (!moved && mode !== "none") {
          // small slop so a click isn't a drag
          if (Math.hypot(dx, dy) < 3) return;
        }
        moved = true;
      }

      if (mode === "drag") {
        game.dragBy(dx / renderer.camera.zoom, dy / renderer.camera.zoom);
        canvas.style.cursor = "grabbing";
        sendLive();
        renderer.invalidate();
      } else if (mode === "pan") {
        renderer.panBy(dx, dy);
        canvas.style.cursor = "grabbing";
      } else if (mode === "marquee") {
        const w = renderer.screenToWorld(p.x, p.y);
        renderer.marquee = { x0: marqueeStart.x, y0: marqueeStart.y, x1: w.x, y1: w.y };
        game.selectRect(marqueeStart.x, marqueeStart.y, w.x, w.y, additive, marqueeBase);
        renderer.invalidate();
      }
      last = p;
    };

    const onLeave = (e: PointerEvent) => {
      // a finger has no hover, and a mouse that left the board has no place on it
      if (e.pointerType === "touch" || !pointers.has(e.pointerId)) cbRef.current.onPointer?.(null);
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerType === "touch") cbRef.current.onPointer?.(null);
      pointers.delete(e.pointerId);
      if (mode === "pinch") {
        if (pointers.size < 2) mode = "none";
        const rest = [...pointers.values()][0];
        if (rest) last = rest;
        return;
      }
      if (mode === "drag") finishDrag();
      if (mode === "marquee") renderer.marquee = null;
      if (mode === "pan" && !moved && e.pointerType === "touch") game.clearSelection();
      mode = "none";
      canvas.style.cursor = "default";
      renderer.invalidate();
    };

    const onDouble = (e: MouseEvent) => {
      if (cbRef.current.paused) return;
      const b = canvas.getBoundingClientRect();
      const hit = renderer.hitTest(renderer.screenToWorld(e.clientX - b.left, e.clientY - b.top));
      if (hit < 0) return;
      game.clickPiece(hit, false);
      cbRef.current.onCommit(game.rotateSelection(1));
      renderer.invalidate();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (cbRef.current.paused) return;
      const p = local(e);
      const mouseWheel = e.deltaMode !== 0 || (e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 40);
      if (e.ctrlKey || e.metaKey || mouseWheel) {
        const k = e.ctrlKey ? 0.01 : 0.0015;
        renderer.zoomAt(p.x, p.y, Math.exp(-e.deltaY * k));
      } else {
        renderer.panBy(-e.deltaX, -e.deltaY);
      }
    };

    // ---------------------------------------------------------- keyboard --
    const typing = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);

    const onKeyDown = (e: KeyboardEvent) => {
      if (typing(e.target) || cbRef.current.paused) return;
      if (e.key === " ") {
        spaceDown = true;
        canvas.style.cursor = "grab";
        e.preventDefault();
        return;
      }
      const hasSel = game.selectedPieces().length > 0;
      const arrows: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      if (arrows[e.key]) {
        e.preventDefault();
        const [ax, ay] = arrows[e.key];
        if (hasSel) {
          // one screen pixel per press (ten with shift), always available
          const step = (e.shiftKey ? 10 : 1) / renderer.camera.zoom;
          game.nudgeSelection(ax * step, ay * step, false);
          renderer.invalidate();
          cbRef.current.onLiveDrag();
          if (nudgeTimer) clearTimeout(nudgeTimer);
          nudgeTimer = setTimeout(() => {
            nudgeTimer = null;
            cbRef.current.onCommit(game.settleSelection());
            renderer.invalidate();
          }, NUDGE_SETTLE_MS);
        } else {
          renderer.panBy(-ax * 60, -ay * 60);
        }
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "r" || k === "e") handle.rotate(e.shiftKey && k === "r" ? -1 : 1);
      else if (k === "q") handle.rotate(-1);
      else if (e.key === "Escape") handle.clearSelection();
      else if (k === "f") renderer.fit();
      else if (e.key === "+" || e.key === "=") renderer.zoomCentered(1.2);
      else if (e.key === "-") renderer.zoomCentered(1 / 1.2);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") {
        spaceDown = false;
        canvas.style.cursor = "default";
      }
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("dblclick", onDouble);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // Keep the picture in step with the game (remote moves bump game.rev).
    const tick = setInterval(() => renderer.syncWithGame(), 80);

    return () => {
      clearInterval(tick);
      if (nudgeTimer) clearTimeout(nudgeTimer);
      if (liveTimer) clearTimeout(liveTimer);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("dblclick", onDouble);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      renderer.destroy();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- renderer is built once per game
  }, [game]);

  useEffect(() => {
    if (image) rendererRef.current?.setImage(image);
  }, [image]);

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full touch-none select-none" aria-label="Puzzle board" />
    </div>
  );
}