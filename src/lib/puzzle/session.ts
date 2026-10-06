import { createClient } from "@/lib/supabase/client";
import { generateRoomCode } from "@/lib/roomCode";
import { scatterPieces } from "./layout";
import { rowsFromPieces } from "./game";
import { makeGeometry } from "./shapes";
import { randomSeed } from "./rng";
import { playerColor } from "./theme";
import type { AspectId, PieceRow, PuzzleMode } from "./types";

export const ROOM_LIFETIME_DAYS = 7;
export const BUCKET = "puzzle-images";

export interface PuzzleRoom {
  id: string;
  code: string;
  host_client_id: string;
  seed: number;
  image_path: string;
  image_width: number;
  image_height: number;
  aspect: AspectId;
  cols: number;
  rows: number;
  mode: PuzzleMode;
  auto_snap: boolean;
  created_at: string;
  last_active_at: string;
}

export interface PuzzleBoard {
  id: string;
  room_id: string;
  owner_client_id: string | null;
  elapsed_seconds: number;
  solved_at: string | null;
}

export interface PuzzlePlayer {
  id: string;
  room_id: string;
  client_id: string;
  name: string;
  color: string;
}

export class PuzzleError extends Error {}

export function imageUrl(path: string): string {
  const supabase = createClient();
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function isExpired(room: PuzzleRoom): boolean {
  return Date.now() - new Date(room.last_active_at).getTime() > ROOM_LIFETIME_DAYS * 86400_000;
}

export interface CreateArgs {
  clientId: string;
  name: string;
  image: Blob;
  imageW: number;
  imageH: number;
  aspect: AspectId;
  cols: number;
  rows: number;
  mode: PuzzleMode;
  autoSnap: boolean;
}

export async function createPuzzleRoom(args: CreateArgs): Promise<string> {
  const supabase = createClient();
  const seed = randomSeed();

  // 1. upload the picture
  const code = await pickFreeCode();
  const ext = args.image.type === "image/png" ? "png" : args.image.type === "image/webp" ? "webp" : "jpg";
  const path = `${code}-${Date.now().toString(36)}.${ext}`;
  const up = await supabase.storage.from(BUCKET).upload(path, args.image, {
    contentType: args.image.type || "image/jpeg",
    cacheControl: "604800",
  });
  if (up.error) throw new PuzzleError(`Couldn't upload the picture: ${up.error.message}`);

  // 2. room
  const { data: room, error: roomErr } = await supabase
    .from("puzzle_rooms")
    .insert({
      code,
      host_client_id: args.clientId,
      seed,
      image_path: path,
      image_width: args.imageW,
      image_height: args.imageH,
      aspect: args.aspect,
      cols: args.cols,
      rows: args.rows,
      mode: args.mode,
      auto_snap: args.autoSnap,
    })
    .select()
    .single();
  if (roomErr || !room) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new PuzzleError(roomErr?.message ?? "Couldn't create the room.");
  }

  // 3. the host's board (co-op: one shared board with no owner)
  const { data: board, error: boardErr } = await supabase
    .from("puzzle_boards")
    .insert({ room_id: room.id, owner_client_id: args.mode === "competition" ? args.clientId : null })
    .select()
    .single();
  if (boardErr || !board) throw new PuzzleError(boardErr?.message ?? "Couldn't create the board.");

  // 4. scatter the pieces
  await insertScatteredPieces(board.id, room as PuzzleRoom);

  // 5. the host as a player
  await upsertPlayer(room.id, args.clientId, args.name, 0);
  return code;
}

async function pickFreeCode(): Promise<string> {
  const supabase = createClient();
  for (let i = 0; i < 6; i++) {
    const code = generateRoomCode();
    const { data } = await supabase.from("puzzle_rooms").select("id").eq("code", code).maybeSingle();
    if (!data) return code;
  }
  throw new PuzzleError("Couldn't find a free room number. Try again.");
}

export async function insertScatteredPieces(boardId: string, room: PuzzleRoom) {
  const geometry = makeGeometry({
    seed: room.seed,
    cols: room.cols,
    rows: room.rows,
    imageW: room.image_width,
    imageH: room.image_height,
  });
  const rows = rowsFromPieces(scatterPieces(geometry)).map((r) => ({ board_id: boardId, ...r }));
  await persistRows(rows);
}

export async function persistRows(rows: Array<PieceRow & { board_id: string }>) {
  const supabase = createClient();
  for (let i = 0; i < rows.length; i += 400) {
    const { error } = await supabase
      .from("puzzle_pieces")
      .upsert(rows.slice(i, i + 400), { onConflict: "board_id,idx" });
    if (error) throw new PuzzleError(error.message);
  }
}

export interface LoadedPuzzle {
  room: PuzzleRoom;
  board: PuzzleBoard;
  pieces: PieceRow[];
  players: PuzzlePlayer[];
}

/** Returns null when the room doesn't exist or has been idle for 7 days. */
export async function loadPuzzle(code: string, clientId: string): Promise<LoadedPuzzle | null> {
  const supabase = createClient();
  const { data: room } = await supabase
    .from("puzzle_rooms")
    .select()
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (!room || isExpired(room as PuzzleRoom)) return null;

  // Co-op: the shared board. Competition: this player's own board (found again
  // through the client id kept in localStorage), created on first visit.
  let board: PuzzleBoard | null = null;
  if ((room as PuzzleRoom).mode === "competition") {
    const { data } = await supabase
      .from("puzzle_boards")
      .select()
      .eq("room_id", room.id)
      .eq("owner_client_id", clientId)
      .maybeSingle();
    board = data as PuzzleBoard | null;
    if (!board) {
      const { data: created, error } = await supabase
        .from("puzzle_boards")
        .insert({ room_id: room.id, owner_client_id: clientId })
        .select()
        .single();
      if (error || !created) throw new PuzzleError(error?.message ?? "Couldn't create your board.");
      board = created as PuzzleBoard;
      await insertScatteredPieces(board.id, room as PuzzleRoom);
    }
  } else {
    const { data } = await supabase
      .from("puzzle_boards")
      .select()
      .eq("room_id", room.id)
      .is("owner_client_id", null)
      .maybeSingle();
    board = data as PuzzleBoard | null;
  }
  if (!board) return null;

  const [{ data: pieces }, { data: players }] = await Promise.all([
    supabase.from("puzzle_pieces").select("idx,x,y,rot,cluster").eq("board_id", board.id).order("idx"),
    supabase.from("puzzle_players").select().eq("room_id", room.id).order("joined_at"),
  ]);

  return {
    room: room as PuzzleRoom,
    board,
    pieces: (pieces ?? []) as PieceRow[],
    players: (players ?? []) as PuzzlePlayer[],
  };
}

export async function roomExists(code: string): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from("puzzle_rooms")
    .select("code,last_active_at")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (!data) return false;
  return Date.now() - new Date(data.last_active_at).getTime() <= ROOM_LIFETIME_DAYS * 86400_000;
}

export async function upsertPlayer(roomId: string, clientId: string, name: string, existingCount: number) {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("puzzle_players")
    .select()
    .eq("room_id", roomId)
    .eq("client_id", clientId)
    .maybeSingle();
  if (existing) {
    if (existing.name !== name) await supabase.from("puzzle_players").update({ name }).eq("id", existing.id);
    return { ...(existing as PuzzlePlayer), name };
  }
  const { data, error } = await supabase
    .from("puzzle_players")
    .insert({ room_id: roomId, client_id: clientId, name, color: playerColor(existingCount) })
    .select()
    .single();
  if (error?.code === "23505") {
    // Two tabs (or a double render) joined at the same moment; the other one won.
    const { data: winner } = await supabase
      .from("puzzle_players")
      .select()
      .eq("room_id", roomId)
      .eq("client_id", clientId)
      .maybeSingle();
    if (winner) return winner as PuzzlePlayer;
  }
  if (error || !data) throw new PuzzleError(error?.message ?? "Couldn't join the room.");
  return data as PuzzlePlayer;
}

export async function touchRoom(roomId: string) {
  await createClient().rpc("puzzle_touch_room", { p_room_id: roomId });
}

export async function addTime(boardId: string, seconds: number) {
  await createClient().rpc("puzzle_add_time", { p_board_id: boardId, p_seconds: seconds });
}

export async function markSolved(boardId: string) {
  await createClient().rpc("puzzle_mark_solved", { p_board_id: boardId });
}

export async function setAutoSnapSetting(roomId: string, on: boolean) {
  const { error } = await createClient().from("puzzle_rooms").update({ auto_snap: on }).eq("id", roomId);
  if (error) throw new PuzzleError(error.message);
}
