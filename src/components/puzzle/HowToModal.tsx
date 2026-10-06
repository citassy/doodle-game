"use client";

import { PtModal } from "./ui";

const STEPS: Array<[string, string]> = [
  ["Pick a picture", "The host uploads any photo and crops it to the shape they like."],
  ["Share the room number", "Send the 4-character code. People can join any time, even halfway through."],
  ["Drag, turn, connect", "Drag pieces around. Select several with a rubber band, then turn them 90 degrees at a time."],
  ["Snap them together", "Matching pieces join up on their own, or with the Snap button if the host turned auto snap off."],
];

export function HowToModal({ onClose }: { onClose: () => void }) {
  return (
    <PtModal onClose={onClose}>
      <h2 className="text-2xl font-medium pr-12">How to play</h2>
      <ol className="mt-5 flex flex-col gap-4">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="flex gap-4">
            <span className="w-9 h-9 rounded-full bg-pt-chip text-pt-accent flex items-center justify-center font-medium flex-shrink-0">
              {i + 1}
            </span>
            <div>
              <div className="font-medium">{title}</div>
              <div className="text-[15px] text-pt-muted leading-snug">{body}</div>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-[13px] text-pt-muted leading-relaxed">
        Handy keys: arrow keys nudge a selection pixel by pixel, R or Q turns it, Space and drag pans, scroll to zoom,
        Esc clears the selection.
      </p>
    </PtModal>
  );
}
