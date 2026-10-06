"use client";

import { forwardRef, useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  small?: boolean;
}

export function PtButton({ variant = "primary", small = false, className = "", children, ...rest }: BtnProps) {
  const size = small ? "h-11 px-5 text-[15px]" : "h-12 px-7 text-base";
  const look =
    variant === "primary"
      ? "bg-pt-accent text-white shadow-[0_6px_14px_rgba(190,85,96,0.3),inset_0_-3px_0_rgba(0,0,0,0.12)] hover:brightness-105"
      : variant === "secondary"
        ? "bg-pt-surface text-pt-ink border-2 border-pt-line shadow-[0_3px_0_var(--pt-line)] hover:border-pt-accent-soft"
        : "bg-transparent text-pt-ink hover:bg-pt-chip";
  return (
    <button
      className={`${size} ${look} rounded-full font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap transition active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none cursor-pointer ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export const PtInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function PtInput(
  { className = "", ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={`w-full h-12 rounded-full bg-pt-surface border-2 border-pt-line px-5 text-base text-pt-ink placeholder:text-pt-muted/70 outline-none focus:border-pt-accent-soft focus:ring-4 focus:ring-pt-accent/10 ${className}`}
      {...rest}
    />
  );
});

export function PtChip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full bg-pt-chip px-3 py-1 text-[13px] font-medium text-pt-muted ${className}`}>
      {children}
    </span>
  );
}

export function PtAvatar({ name, color, size = 32, dim = false }: { name: string; color: string; size?: number; dim?: boolean }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-medium text-white border-[3px] border-pt-surface flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.38, opacity: dim ? 0.35 : 1 }}
      aria-hidden="true"
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function PtSwitch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-pt-accent" : "bg-pt-line"
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : ""}`}
      />
    </button>
  );
}

export function PtModal({ onClose, children, wide = false }: { onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-pt-ink/30 backdrop-blur-[2px] flex items-center justify-center p-5" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${wide ? "max-w-3xl" : "max-w-md"} rounded-[32px] bg-pt-surface border-2 border-pt-line shadow-[0_10px_0_var(--pt-line),0_30px_60px_rgba(90,58,58,0.18)] p-7`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 w-11 h-11 rounded-full bg-pt-chip text-pt-ink flex items-center justify-center cursor-pointer hover:bg-pt-line"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}

export function PieceGlyph({ size = 20, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="-20 -20 140 140" aria-hidden="true">
      <path
        d="M 0,0 L 35,0 C 35,-12 44,-18 50,-18 C 56,-18 65,-12 65,0 L 100,0 L 100,35 C 112,35 118,44 118,50 C 118,56 112,65 100,65 L 100,100 L 0,100 Z"
        fill={color}
        stroke={color}
        strokeWidth="14"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  return h > 0 ? `${h}:${mm}:${String(sec).padStart(2, "0")}` : `${mm}:${String(sec).padStart(2, "0")}`;
}

export function HourglassIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 2h12v5c0 2-2 3.5-4.5 5 2.5 1.5 4.5 3 4.5 5v5H6v-5c0-2 2-3.5 4.5-5C8 10.5 6 9 6 7V2z" />
    </svg>
  );
}

export function Chevron({ dir, size = 16 }: { dir: "up" | "down" | "left" | "right"; size?: number }) {
  const d = { up: "M6 15l6-6 6 6", down: "M6 9l6 6 6-6", left: "M15 6l-6 6 6 6", right: "M9 6l6 6-6 6" }[dir];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function GearIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}