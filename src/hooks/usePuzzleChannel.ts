"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { EVENTS, type CursorMsg, type DragMsg, type PresenceMember, type RowsMsg, type SettingsMsg, type TimeMsg } from "@/lib/puzzle/protocol";

export interface ChannelHandlers {
  onDrag: (m: DragMsg) => void;
  onRows: (m: RowsMsg) => void;
  onSettings: (m: SettingsMsg) => void;
  onTime: (m: TimeMsg) => void;
  onCursor: (m: CursorMsg) => void;
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
      .on("broadcast", { event: EVENTS.settings }, ({ payload }) => handlersRef.current.onSettings(payload as SettingsMsg))
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
          await channel.track({ clientId: meId, name: meName ?? "", color: meColor ?? "#BE5560", ...statsRef.current });
        }
      });

    return () => {
      setConnected(false);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [boardId, meId, meName, meColor]);

  const send = useCallback((event: string, payload: unknown) => {
    channelRef.current?.send({ type: "broadcast", event, payload });
  }, []);

  const sendDrag = useCallback((m: DragMsg) => send(EVENTS.drag, m), [send]);
  const sendRows = useCallback((m: RowsMsg) => send(EVENTS.rows, m), [send]);
  const sendSettings = useCallback((m: SettingsMsg) => send(EVENTS.settings, m), [send]);
  const sendTime = useCallback((m: TimeMsg) => send(EVENTS.time, m), [send]);
  const sendCursor = useCallback((m: CursorMsg) => send(EVENTS.cursor, m), [send]);

  /** Share our time in the room and joins with everyone; they show up on our avatar. */
  const setStats = useCallback(
    (s: { secs: number; joins: number }) => {
      statsRef.current = s;
      if (!connected || !channelRef.current || !meId) return;
      void channelRef.current.track({ clientId: meId, name: meName ?? "", color: meColor ?? "#BE5560", ...s });
    },
    [connected, meId, meName, meColor]
  );

  /** The member with the lowest id keeps the clock, so it only ticks once. */
  const isTicker = connected && online.length > 0 && online[0].clientId === meId;

  return { online, connected, isTicker, sendDrag, sendRows, sendSettings, sendTime, sendCursor, setStats };
}