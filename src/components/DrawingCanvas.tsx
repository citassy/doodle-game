"use client";

import { useEffect, useRef, useState } from "react";
import type { StrokePoint } from "@/lib/database.types";

const LOGICAL_SIZE = 500;
const STROKE_WIDTH = 3.2;

interface Props {
  initialStrokes?: StrokePoint[][];
  onChange: (strokes: StrokePoint[][]) => void;
  disabled?: boolean;
}

export function DrawingCanvas({ initialStrokes = [], onChange, disabled = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<StrokePoint[][]>(initialStrokes);
  const [, forceRender] = useState(0);
  const drawingRef = useRef(false);
  const strokeStartRef = useRef(0);

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = STROKE_WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of strokesRef.current) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (const point of stroke.slice(1)) ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
  }

  useEffect(() => {
    strokesRef.current = initialStrokes;
    redraw();
  }, [initialStrokes]);

  function toLogical(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * LOGICAL_SIZE,
      y: ((e.clientY - rect.top) / rect.height) * LOGICAL_SIZE,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    strokeStartRef.current = Date.now();
    const { x, y } = toLogical(e);
    strokesRef.current = [...strokesRef.current, [{ x, y, t: 0 }]];
    redraw();
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || disabled) return;
    const { x, y } = toLogical(e);
    const strokes = strokesRef.current;
    const current = strokes[strokes.length - 1];
    current.push({ x, y, t: Date.now() - strokeStartRef.current });
    redraw();
  }

  function endStroke() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onChange(strokesRef.current);
    forceRender((n) => n + 1);
  }

  return (
    <div
      className="relative border-2 border-ink rounded-lg bg-paper overflow-hidden select-none"
      style={{ aspectRatio: "1 / 1", touchAction: "none" }}
    >
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(var(--border-muted) 1px, transparent 1px), linear-gradient(90deg, var(--border-muted) 1px, transparent 1px)",
          backgroundSize: "10% 10%",
        }}
      />
      <canvas
        ref={canvasRef}
        width={LOGICAL_SIZE}
        height={LOGICAL_SIZE}
        className="relative w-full h-full touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
        onPointerCancel={endStroke}
      />
    </div>
  );
}