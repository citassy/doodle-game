"use client";

import { use, useState } from "react";
import { useRoomRealtime } from "@/hooks/useRoomRealtime";
import { getLocalPlayerId } from "@/lib/localPlayer";
import {
  setWordGiverMode,
  setWordGiverTiming,
  setAutoAdvanceCanvas,
  setMixDrawings,
  setDrawSeconds,
  setGuessSeconds,
  startGame,
  RoomError,
} from "@/lib/room";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { Toggle } from "@/components/Toggle";
import { SecondsStepper } from "@/components/SecondsStepper";
import { DrawingRound } from "@/components/DrawingRound";
import { TransitionScreen, CountdownScreen } from "@/components/PhaseInterstitials";
import { GuessingRound } from "@/components/GuessingRound";
import { RoundResults } from "@/components/RoundResults";
import { FinalResults } from "@/components/FinalResults";
import { WordGiverPrepScreen } from "@/components/WordGiverPrepScreen";
import { WaitingForWordsScreen } from "@/components/WaitingForWordsScreen";
import { WatchDrawingsLive } from "@/components/WatchDrawingsLive";
import { WordGiverFirstPickScreen } from "@/components/WordGiverFirstPickScreen";
import { WordGiverGuessView } from "@/components/WordGiverGuessView";
import { useHostGuessingController } from "@/hooks/useHostGuessingController";
import { useHostPrepController } from "@/hooks/useHostPrepController";
import { useHostRoundBroadcast } from "@/hooks/useHostRoundBroadcast";
import type { WordGiverMode, WordGiverTiming } from "@/lib/database.types";

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { room, players, loading, notFound } = useRoomRealtime(code);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const myId = getLocalPlayerId();
  const isHost = players.find((p) => p.client_id === myId)?.is_host ?? false;
  useHostGuessingController(room, isHost);
  useHostPrepController(room, isHost);
  useHostRoundBroadcast(room, isHost);

  if (loading) {
    return <CenteredMessage>loading room…</CenteredMessage>;
  }

  if (notFound || !room) {
    return <CenteredMessage>couldn&apos;t find room {code.toUpperCase()}</CenteredMessage>;
  }

  const me = players.find((p) => p.client_id === myId);

  const isWordGiver = room.word_giver_mode === "player" && me?.id === room.word_giver_player_id;

  if (room.status === "prep") {
    if (!me) return <CenteredMessage>you&apos;re not in this room</CenteredMessage>;
    if (isWordGiver) return <WordGiverPrepScreen room={room} />;
    const giver = players.find((p) => p.id === room.word_giver_player_id);
    return <WaitingForWordsScreen room={room} giver={giver} />;
  }

  if (room.status === "drawing") {
    if (!me) return <CenteredMessage>you&apos;re not in this room</CenteredMessage>;
    if (isWordGiver) {
      return <WatchDrawingsLive room={room} players={players.filter((p) => p.id !== me.id)} />;
    }
    return <DrawingRound room={room} me={me} />;
  }

  if (room.status === "transition") {
    if (isWordGiver) return <WordGiverFirstPickScreen room={room} />;
    return <TransitionScreen />;
  }

  if (room.status === "countdown") {
    return <CountdownScreen room={room} />;
  }

  if (room.status === "guessing") {
    if (!me) return <CenteredMessage>you&apos;re not in this room</CenteredMessage>;
    if (isWordGiver) return <WordGiverGuessView room={room} me={me} players={players} />;
    const targetRound = room.revealed_numbers[room.revealed_numbers.length - 1];
    return <GuessingRound key={targetRound} room={room} me={me} />;
  }

  if (room.status === "round_results") {
    if (!me) return <CenteredMessage>you&apos;re not in this room</CenteredMessage>;
    if (isWordGiver) return <WordGiverGuessView room={room} me={me} players={players} />;
    return <RoundResults room={room} me={me} players={players} />;
  }

  if (room.status === "finished") {
    if (!me) return <CenteredMessage>you&apos;re not in this room</CenteredMessage>;
    return <FinalResults room={room} me={me} players={players} />;
  }

  async function handleModeChange(mode: WordGiverMode, wordGiverPlayerId: string | null) {
    if (!room) return;
    try {
      await setWordGiverMode(room.id, mode, wordGiverPlayerId);
    } catch (err) {
      setError(err instanceof RoomError ? err.message : "Something went wrong.");
    }
  }

  async function handleTimingChange(timing: WordGiverTiming) {
    if (!room) return;
    try {
      await setWordGiverTiming(room.id, timing);
    } catch (err) {
      setError(err instanceof RoomError ? err.message : "Something went wrong.");
    }
  }

  async function handleAutoAdvanceChange(value: boolean) {
    if (!room) return;
    try {
      await setAutoAdvanceCanvas(room.id, value);
    } catch (err) {
      setError(err instanceof RoomError ? err.message : "Something went wrong.");
    }
  }

  async function handleMixDrawingsChange(value: boolean) {
    if (!room) return;
    try {
      await setMixDrawings(room.id, value);
    } catch (err) {
      setError(err instanceof RoomError ? err.message : "Something went wrong.");
    }
  }

  async function handleDrawSecondsChange(value: number) {
    if (!room) return;
    try {
      await setDrawSeconds(room.id, value);
    } catch (err) {
      setError(err instanceof RoomError ? err.message : "Something went wrong.");
    }
  }

  async function handleGuessSecondsChange(value: number) {
    if (!room) return;
    try {
      await setGuessSeconds(room.id, value);
    } catch (err) {
      setError(err instanceof RoomError ? err.message : "Something went wrong.");
    }
  }

  async function handleStart() {
    if (!room) return;
    setError("");
    setStarting(true);
    try {
      await startGame(room);
    } catch (err) {
      setError(err instanceof RoomError ? err.message : "Something went wrong.");
    } finally {
      setStarting(false);
    }
  }

  const eligibleForMixing =
    room.word_giver_mode === "computer" ? players.length >= 2 : players.length >= 3;

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 gap-8 py-8">
      <div className="w-full max-w-sm bg-paper border-2 border-ink rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-hand font-bold text-xl bg-coral text-coral-text rounded-md px-2 -rotate-1 inline-block">
            {room.code}
          </span>
          <span className="text-sm text-ink/50">room code</span>
        </div>

        <div className="flex flex-col gap-1.5 mb-4">
          {players.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 border-[1.5px] border-border-muted rounded-lg px-2.5 py-1.5"
            >
              <Avatar name={p.name} color={p.color} size={24} />
              <span className="text-base">{p.name}</span>
              {p.is_host && <span className="ml-auto font-hand text-base text-coral-text">host</span>}
            </div>
          ))}
          {players.length < 2 && (
            <p className="text-sm text-ink/40 text-center border-[1.5px] border-dashed border-border-muted rounded-lg px-2.5 py-1.5">
              you can start solo, or share the room code above
            </p>
          )}
        </div>

        {isHost ? (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-ink/50">word giver</span>
              <select
                className="w-full border-[1.5px] border-ink rounded-lg px-3 py-2.5 bg-paper text-base"
                value={room.word_giver_mode === "player" ? room.word_giver_player_id ?? "" : "computer"}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "computer") handleModeChange("computer", null);
                  else handleModeChange("player", v);
                }}
                disabled={players.length < 2}
              >
                <option value="computer">Computer</option>
                {players
                  .filter((p) => p.id !== me?.id || players.length > 1)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>

            {room.word_giver_mode === "player" && (
              <label className="flex flex-col gap-1">
                <span className="text-sm text-ink/50">when do they give words?</span>
                <select
                  className="w-full border-[1.5px] border-ink rounded-lg px-3 py-2.5 bg-paper text-base"
                  value={room.word_giver_timing}
                  onChange={(e) => handleTimingChange(e.target.value as WordGiverTiming)}
                >
                  <option value="ahead_of_time">All ahead of time (2.5 min to write 20)</option>
                  <option value="round_by_round">One at a time, round by round</option>
                </select>
              </label>
            )}

            <div className="border-t border-border-muted pt-2 mt-1 flex flex-col gap-1">
              <Toggle
                checked={room.auto_advance_canvas}
                onChange={handleAutoAdvanceChange}
                label="canvas changes automatically"
              />
              
              <Toggle
                checked={room.mix_drawings}
                onChange={handleMixDrawingsChange}
                label="mix up whose drawing gets guessed"
                disabled={!eligibleForMixing}
              />
              {!eligibleForMixing && (
                <p className="text-xs text-ink/40 -mt-1 mb-1">
                  needs at least {room.word_giver_mode === "computer" ? "2 players" : "3 players (1 word giver + 2 drawers)"}
                </p>
              )}
              
              <SecondsStepper
                label="time to draw each word"
                value={room.draw_seconds}
                onChange={handleDrawSecondsChange}
              />
              <SecondsStepper
                label="time to guess each word"
                value={room.guess_seconds}
                onChange={handleGuessSecondsChange}
              />
            </div>

            {error && <p className="text-base text-coral-text">{error}</p>}

            <Button onClick={handleStart} disabled={starting}>
              {starting ? "Starting…" : "Start"}
            </Button>
          </div>
        ) : (
          <p className="text-base text-ink/50 text-center pt-1">waiting for the host to start…</p>
        )}
      </div>
    </main>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 flex items-center justify-center px-6">
      <p className="font-hand text-3xl text-ink/60">{children}</p>
    </main>
  );
}