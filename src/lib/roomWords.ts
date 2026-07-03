import { createClient } from "@/lib/supabase/client";
import type { RoomWord } from "@/lib/database.types";

export async function fetchRoomWords(roomId: string): Promise<RoomWord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("room_words")
    .select()
    .eq("room_id", roomId)
    .order("round_number", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as RoomWord[]) ?? [];
}