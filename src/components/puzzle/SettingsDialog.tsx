"use client";

import { useState, type ReactNode } from "react";
import { PtButton, PtModal, PtSwitch } from "./ui";

export interface RoomSettings {
  cursors: boolean;
  names: boolean;
  guide: boolean;
  autoSnap: boolean;
}

function Row({
  title,
  hint,
  checked,
  onChange,
  disabled,
  indent,
  note,
}: {
  title: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  indent?: boolean;
  note?: ReactNode;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3.5 ${indent ? "pl-5 border-l-2 border-pt-line ml-1" : ""} ${disabled ? "opacity-60" : ""}`}>
      <div className="min-w-0">
        <div className="font-medium text-[16px]">{title}</div>
        <div className="text-[14px] text-pt-muted leading-snug mt-0.5">{hint}</div>
        {note && <div className="text-[13px] text-pt-accent mt-1">{note}</div>}
      </div>
      <PtSwitch checked={checked} onChange={onChange} label={title} disabled={disabled} />
    </div>
  );
}

/**
 * Settings are edited on a copy. Save applies them, the X (or Esc, or a click outside) throws the changes away.
 * Cursors, names and the guide are only for you; auto snap is shared, so only the host can change it.
 */
export function SettingsDialog({
  initial,
  isHost,
  onSave,
  onClose,
}: {
  initial: RoomSettings;
  isHost: boolean;
  onSave: (next: RoomSettings) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const set = <K extends keyof RoomSettings>(k: K, v: RoomSettings[K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <PtModal onClose={onClose}>
      <h2 className="text-2xl font-medium pr-12">Settings</h2>

      <div className="mt-3 divide-y divide-pt-line">
        <div>
          <Row
            title="Show other people's cursors"
            hint="See where everyone is pointing while you build."
            checked={draft.cursors}
            onChange={(v) => set("cursors", v)}
          />
          <Row
            title="Show their names"
            hint="A little name tag next to each cursor."
            checked={draft.names}
            onChange={(v) => set("names", v)}
            disabled={!draft.cursors}
            indent
          />
        </div>
        <Row title="Guide" hint="A faint dashed outline showing where the finished puzzle goes." checked={draft.guide} onChange={(v) => set("guide", v)} />
        <Row
          title="Auto snap"
          hint="Matching pieces join by themselves when they get close. This is the same for everyone in the room."
          checked={draft.autoSnap}
          onChange={(v) => set("autoSnap", v)}
          disabled={!isHost}
          note={!isHost ? "Only the host can change this." : undefined}
        />
      </div>

      <div className="mt-6 flex justify-end">
        <PtButton onClick={() => onSave(draft)}>Save</PtButton>
      </div>
    </PtModal>
  );
}