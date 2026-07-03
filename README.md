# doodle

A multiplayer draw-then-guess party game. Built with Next.js (App Router) and Supabase (Postgres + Realtime).

## What's built so far

- Full DB schema (`supabase/migrations/0001_init.sql`) — rooms, players, words, room_words, drawings, guesses, cleanup trigger
- Starter word bank with ~80 words tagged by category/difficulty/similarity (`0002_seed_words.sql`)
- Welcome page — enter a name, create or join a room by 4-character code
- Lobby — live player list (Supabase Realtime), host-only word-giver dropdown (computer / a player), start button
- Anonymous identity — a UUID + name in `localStorage`, no login required
- Computer word selection with light anti-repeat + tag-similarity weighting

## Not built yet (next steps)

- The drawing round screen (canvas, word broadcast timer, personal progress cursor)
- Inter-round countdown / "waiting for others" transition screens
- The guessing round screen
- Round results screen (grid of drawings + guesses + correctness)
- Final results screen + play again
- Player word-giver mode: word-writing prep screen, live drawing-watch view, number picker
- `pg_cron` schedule activation for the 30-minute stale room cleanup (the SQL function and trigger exist; scheduling it is a one-time manual step, see bottom of `0001_init.sql`)

## Setup

1. Create a Supabase project at supabase.com.
2. In the SQL editor, run `supabase/migrations/0001_init.sql`, then `0002_seed_words.sql`.
3. In Database -> Replication, enable Realtime on the `rooms` and `players` tables (Realtime on Postgres changes is off by default per table).
4. Copy `.env.local.example` to `.env.local` and fill in your project's URL and anon key (Settings -> API).
5. `npm install`
6. `npm run dev`

## Notes on the data model

- No Supabase Auth — every player is anonymous, identified only by a client-generated UUID. Room access is gated by knowledge of the 4-character code, the same trust model as skribbl.io. RLS policies are intentionally open (any anon-key request can read/write) to match. Worth hardening later if this ever needs to resist griefing (e.g. scoping writes to rows the caller's player_id owns via a signed cookie).
- `drawings.strokes` stores each stroke as an array of `{x, y, t}` points rather than a flattened image, so the reveal screen can replay the drawing being drawn, and so storage stays small.
- Timers are server-authoritative: `rooms.phase_deadline` is a timestamp written by whoever triggers a phase change; clients count down against it rather than running independent timers, so a laggy client can't drift out of sync with the room.
