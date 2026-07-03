"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { TextInput } from "@/components/TextInput";
import { createRoom, joinRoom, RoomError } from "@/lib/room";
import { getSavedName, saveName } from "@/lib/localPlayer";

export default function WelcomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState<"join" | "create" | null>(null);
  const [error, setError] = useState("");

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
      router.push(`/room/${room.code}`);
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
      router.push(`/room/${room.code}`);
    } catch (err) {
      setError(err instanceof RoomError ? err.message : "Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6">
      <h1 className="font-hand text-5xl font-bold mb-8 -rotate-1">doodle</h1>

      <div className="w-full max-w-xs flex flex-col gap-3">
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
      </div>
    </main>
  );
}
