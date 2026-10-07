"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { EVENTS, type CursorMsg, type DragMsg, type PresenceMember, type RowsMsg, type TimeMsg } from "@/lib/puzzle/protocol";

export interface ChannelHandlers {
  onDrag: (m: DragMsg) => void;
  onRows: (m: RowsMsg) => void;
  onTime: (m: TimeMsg) => void;
  onCursor: (m: CursorMsg) => void;
  /** The connection came back (or we woke up). Messages may have been missed, so reload the board from the database. */
  onResync: () => void;
}

/**
 * One Realtime channel per board. Broadcast carries live dragging (never saved)
 * and finished moves; presence says who is in the room, which also decides who
 * runs the timer.
 */
export function usePuzzleChannel(args: {
  boardId: string | null;
  me: PresenceMember | null;
  handlers: ChannelHandlers;
}) {
  const { boardId, me } = args;
  const handlersRef = useRef(args.handlers);
  useEffect(() => {
    handlersRef.current = args.handlers;
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const [online, setOnline] = useState<PresenceMember[]>([]);
  const [connected, setConnected] = useState(false);
  const [everConnected, setEverConnected] = useState(false);
  const [epoch, setEpoch] = useState(0); // bump to throw the channel away and open a fresh one
  const joinedBefore = useRef(false);

  const statsRef = useRef<{ secs?: number; joins?: number }>({});

  const meId = me?.clientId;
  const meName = me?.name;
  const meColor = me?.color;

  useEffect(() => {
    if (!boardId || !meId) return;
    const supabase = createClient();
    const channel = supabase.channel(`puzzle:${boardId}`, {
      config: { broadcast: { self: false }, presence: { key: meId } },
    });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: EVENTS.drag }, ({ payload }) => handlersRef.current.onDrag(payload as DragMsg))
      .on("broadcast", { event: EVENTS.rows }, ({ payload }) => handlersRef.current.onRows(payload as RowsMsg))
      .on("broadcast", { event: EVENTS.time }, ({ payload }) => handlersRef.current.onTime(payload as TimeMsg))
      .on("broadcast", { event: EVENTS.cursor }, ({ payload }) => handlersRef.current.onCursor(payload as CursorMsg))
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceMember>();
        const list: PresenceMember[] = [];
        for (const metas of Object.values(state)) if (metas[0]) list.push(metas[0]);
        list.sort((a, b) => a.clientId.localeCompare(b.clientId));
        setOnline(list);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setConnected(true);
          setEverConnected(true);
          if (joinedBefore.current) handlersRef.current.onResync();
          joinedBefore.current = true;
          await channel.track({ clientId: meId, name: meName ?? "", color: meColor ?? "#BE5560", ...statsRef.current });
        }
      });

    return () => {
      setConnected(false);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [boardId, meId, meName, meColor, epoch]);

  // Watchdog. The live connection can drop without anyone noticing (sleep, wifi change, a tab left in the background).
  // If the channel isn't joined for two checks in a row, or when the tab wakes up, open a fresh one and catch up.
  useEffect(() => {
    if (!boardId || !meId) return;
    let bad = 0;
    const check = () => {
      const ch = channelRef.current;
      if (!ch) return;
      if ((ch.state as string) === "joined") {
        bad = 0;
        return;
      }
      if (++bad >= 2) {
        bad = 0;
        setEpoch((e) => e + 1);
      }
    };
    const timer = setInterval(check, 4000);
    const wake = () => {
      if (document.visibilityState !== "visible") return;
      bad = 1;
      check();
      handlersRef.current.onResync(); // we may have missed moves while away
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
    };
  }, [boardId, meId]);

  const send = useCallback((event: string, payload: unknown) => {
    channelRef.current?.send({ type: "broadcast", event, payload });
  }, []);

  const sendDrag = useCallback((m: DragMsg) => send(EVENTS.drag, m), [send]);
  const sendRows = useCallback((m: RowsMsg) => send(EVENTS.rows, m), [send]);
  const sendTime = useCallback((m: TimeMsg) => send(EVENTS.time, m), [send]);
  const sendCursor = useCallback((m: CursorMsg) => send(EVENTS.cursor, m), [send]);

  /** Share our time in the room and joins with everyone; they show up on our avatar. */
  const setStats = useCallback(
    (s: { secs: number; joins: number }) => {
      statsRef.current = s;
      const ch = channelRef.current;
      if (!connected || !ch || !meId) return;
      // This also works as a health check: if the server doesn't answer, the connection is dead, so start over.
      void ch.track({ clientId: meId, name: meName ?? "", color: meColor ?? "#BE5560", ...s }).then((r) => {
        if (r !== "ok" && channelRef.current === ch) setEpoch((e) => e + 1);
      });
    },
    [connected, meId, meName, meColor]
  );

  /** The member with the lowest id keeps the clock, so it only ticks once. */
  const isTicker = connected && online.length > 0 && online[0].clientId === meId;

  return { online, connected, reconnecting: everConnected && !connected, isTicker, sendDrag, sendRows, sendTime, sendCursor, setStats };
}