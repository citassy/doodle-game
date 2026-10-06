"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { TextInput } from "@/components/TextInput";
import { Modal } from "@/components/Modal";
import { TutorialCarousel } from "@/components/TutorialCarousel";
import { LandingCards } from "@/components/doodle/LandingCards";
import { createRoom, joinRoom, RoomError } from "@/lib/room";
import { getSavedName, saveName } from "@/lib/localPlayer";

export default function WelcomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState<"join" | "create" | null>(null);
  const [error, setError] = useState("");
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const saved = getSavedName();
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage, not derived from external subscription
      setName(saved);
    }
  }, []);

  async function handleJoin() {
    setError("");
    if (!name.trim()) return setError("Enter a name first.");
    if (!code.trim()) return setError("Enter a room number.");
    setLoading("join");
    try {
      saveName(name.trim());
      const { room } = await joinRoom(name, code);
      router.push(`/draw-n-guess/room/${room.code}`);
    } catch (err) {
      setError(err instanceof RoomError ? err.message : "Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  async function handleCreate() {
    setError("");
    if (!name.trim()) return setError("Enter a name first.");
    setLoading("create");
    try {
      saveName(name.trim());
      const { room } = await createRoom(name);
      router.push(`/draw-n-guess/room/${room.code}`);
    } catch (err) {
      setError(err instanceof RoomError ? err.message : "Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="dg-main w-full flex-1 flex flex-col items-center justify-center py-16 relative overflow-hidden">
      <LandingCards />
      <Link href="/" className="absolute left-5 top-5 z-10 font-hand text-xl text-ink/60 hover:text-ink transition-colors">
        ← All games
      </Link>
      <h1 className="relative z-10 font-hand text-5xl font-bold mb-8 -rotate-1">Draw n&apos; Guess</h1>

      <div className="relative z-10 w-full max-w-xs flex flex-col gap-3">
        <TextInput
          placeholder="Your name"
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
        />
        <TextInput
          placeholder="Enter room number"
          value={code}
          maxLength={4}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        />

        {error && <p className="text-sm text-coral-text -mt-1">{error}</p>}

        <Button onClick={handleJoin} disabled={loading !== null}>
          {loading === "join" ? "Joining…" : "Join room"}
        </Button>
        <Button variant="secondary" onClick={handleCreate} disabled={loading !== null}>
          {loading === "create" ? "Creating…" : "Create room"}
        </Button>
        <Button variant="secondary" onClick={() => setShowTutorial(true)}>
          How to play?
        </Button>
      </div>

      {showTutorial && (
        <Modal onClose={() => setShowTutorial(false)}>
          <TutorialCarousel />
        </Modal>
      )}
    </main>
  );
}