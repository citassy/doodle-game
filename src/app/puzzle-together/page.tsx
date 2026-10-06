"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PtButton, PtInput, PieceGlyph } from "@/components/puzzle/ui";
import { LandingPieces } from "@/components/puzzle/LandingPieces";
import { HowToModal } from "@/components/puzzle/HowToModal";
import { getSavedName, saveName } from "@/lib/localPlayer";
import { roomExists } from "@/lib/puzzle/session";

export default function PuzzleLandingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [howTo, setHowTo] = useState(false);

  useEffect(() => {
    const saved = getSavedName();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
    if (saved) setName(saved);
  }, []);

  async function join() {
    setError("");
    if (!name.trim()) return setError("Enter a name first.");
    if (code.trim().length < 4) return setError("Enter the 4-character room number.");
    setBusy(true);
    try {
      if (!(await roomExists(code))) {
        setError("We couldn't find that room. It may have expired.");
        return;
      }
      saveName(name.trim());
      router.push(`/puzzle-together/${code.trim().toUpperCase()}`);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function create() {
    setError("");
    if (!name.trim()) return setError("Enter a name first.");
    saveName(name.trim());
    router.push("/puzzle-together/new");
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-[13vw] sm:px-6 py-16 relative overflow-hidden">
      <LandingPieces />
      <Link href="/" className="absolute left-6 top-6 z-10 h-11 px-4 inline-flex items-center rounded-full text-pt-muted hover:bg-pt-chip">
        ← All games
      </Link>

      <span className="relative z-10 w-16 h-16 rounded-full bg-pt-accent flex items-center justify-center shadow-[0_6px_14px_rgba(190,85,96,0.3)]">
        <PieceGlyph size={34} />
      </span>
      <h1 className="relative z-10 mt-5 text-4xl font-medium">Puzzle Together</h1>
      <p className="relative z-10 mt-2 text-pt-muted text-center">Build a jigsaw with friends, from anywhere.</p>

      <div className="relative z-10 mt-8 w-full max-w-xs flex flex-col gap-3">
        <PtInput placeholder="Your name" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} aria-label="Your name" />
        <PtInput
          placeholder="Enter room number"
          value={code}
          maxLength={4}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && join()}
          aria-label="Room number"
          className="tracking-widest"
        />
        {error && <p className="text-sm text-pt-accent px-2">{error}</p>}
        <PtButton onClick={join} disabled={busy} className="mt-2">
          {busy ? "Joining…" : "Join room"}
        </PtButton>
        <PtButton variant="secondary" onClick={create} disabled={busy}>
          Create room
        </PtButton>
        <PtButton variant="ghost" onClick={() => setHowTo(true)}>
          How to play?
        </PtButton>
      </div>

      {howTo && <HowToModal onClose={() => setHowTo(false)} />}
    </main>
  );
}
