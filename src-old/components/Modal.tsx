"use client";

import { useEffect } from "react";
import { CloseIcon } from "@/components/CloseIcon";

export function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div className="relative w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
      <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-3 -right-3 z-10 w-12 h-12 rounded-full bg-paper border-2 border-ink flex items-center justify-center text-ink transition-colors hover:bg-ink hover:text-paper"
        >
          <CloseIcon size={22} />
        </button>
        {children}
      </div>
    </div>
  );
}