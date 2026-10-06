import { createClient } from "@/lib/supabase/client";

// Personal preference, not a room-wide setting — each player decides for
// themselves whether their own canvas snaps to the next word automatically,
// independent of what anyone else in the room has chosen.
export async function setMyAutoAdvanceCanvas(playerId: string, value: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("players")
    .update({ auto_advance_canvas: value })
    .eq("id", playerId);
  if (error) throw new Error(error.message);
}