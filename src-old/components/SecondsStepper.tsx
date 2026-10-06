"use client";

const STEP = 0.5;
const MIN = 1;

export function SecondsStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-base">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(MIN, Math.round((value - STEP) * 10) / 10))}
          className="w-7 h-7 rounded-full border-[1.5px] border-ink flex items-center justify-center font-hand text-lg"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="font-hand text-base w-14 text-center">{formatSeconds(value)}</span>
        <button
          type="button"
          onClick={() => onChange(Math.round((value + STEP) * 10) / 10)}
          className="w-7 h-7 rounded-full border-[1.5px] border-ink flex items-center justify-center font-hand text-lg"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function formatSeconds(s: number): string {
  const rounded = Math.round(s * 10) / 10;
  return `${rounded}s`;
}