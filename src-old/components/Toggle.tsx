"use client";

import { useState } from "react";
import { InfoIcon } from "@/components/InfoIcon";

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  info,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  info?: string;
}) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className={`py-1 ${disabled ? "opacity-40" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-base">
          {label}{" "}
          {info && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowInfo((s) => !s);
              }}
              aria-label={`More info about "${label}"`}
              aria-expanded={showInfo}
              className="inline-flex align-middle text-ink/40 hover:text-ink/70"
            >
              <InfoIcon size={15} />
            </button>
          )}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
            checked ? "bg-ink" : "bg-border-muted"
          } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-paper transition-transform ${
              checked ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
      {info && showInfo && <p className="text-sm text-ink/50 mt-1 pr-8">{info}</p>}
    </div>
  );
}