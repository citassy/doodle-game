"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Room, Player } from "@/lib/database.types";

export function useRoomRealtime(code: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const refetchPlayers = useCallback(async (roomId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("players")
      .select()
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });
    if (data) setPlayers(data);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function init() {
      const { data: roomData } = await supabase
        .from("rooms")
        .select()
        .eq("code", code.toUpperCase())
        .maybeSingle();

      if (cancelled) return;
      if (!roomData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setRoom(roomData);
      await refetchPlayers(roomData.id);
      setLoading(false);

      const channel = supabase
        .channel(`room:${roomData.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomData.id}` },
          (payload) => setRoom(payload.new as Room)
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomData.id}` },
          () => refetchPlayers(roomData.id)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    const cleanupPromise = init();

    return () => {
      cancelled = true;
      cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, [code, refetchPlayers]);

  return { room, players, loading, notFound };
}
