-- Doodle game schema
-- No Supabase Auth is used. Every player is anonymous, identified by a
-- client-generated UUID stored in localStorage. Access is effectively
-- gated by knowledge of the 4-character room code, same trust model as
-- skribbl.io / jackbox style games. RLS policies below are intentionally
-- open (anon key can read/write) to match that model. Revisit if this
-- ever needs to be hardened.

create extension if not exists "pgcrypto";

create table rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_player_id uuid,
  status text not null default 'lobby'
    check (status in ('lobby', 'prep', 'countdown', 'drawing', 'transition', 'guessing', 'round_results', 'finished')),
  word_giver_mode text not null default 'computer'
    check (word_giver_mode in ('computer', 'player')),
  word_giver_player_id uuid,
  current_round smallint not null default 0,
  phase_deadline timestamptz,
  revealed_numbers smallint[] not null default '{}',
  max_players smallint not null default 20,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  name text not null,
  color text not null default '#F0997B',
  is_host boolean not null default false,
  is_word_giver boolean not null default false,
  score int not null default 0,
  connected boolean not null default true,
  joined_at timestamptz not null default now()
);

alter table rooms
  add constraint rooms_host_player_id_fkey
  foreign key (host_player_id) references players(id) on delete set null;

alter table rooms
  add constraint rooms_word_giver_player_id_fkey
  foreign key (word_giver_player_id) references players(id) on delete set null;

-- Curated word bank. tags are used for loose "similarity" weighting when
-- the computer picks words (e.g. round + food + small) so occasional runs
-- of visually/conceptually related words can occur.
create table words (
  id uuid primary key default gen_random_uuid(),
  text text not null unique,
  category text not null,
  difficulty smallint not null default 2 check (difficulty between 1 and 3),
  tags text[] not null default '{}'
);

-- The 20 words assigned to a given room for part 1, in round order.
create table room_words (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  round_number smallint not null check (round_number between 1 and 20),
  word_text text not null,
  unique (room_id, round_number)
);

-- One doodle per player per round. strokes is an array of stroke objects,
-- each stroke an array of {x, y, t} points (t = ms offset from stroke start)
-- so the reveal screen can optionally replay the drawing.
create table drawings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  round_number smallint not null check (round_number between 1 and 20),
  strokes jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  unique (room_id, player_id, round_number)
);

create table guesses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  round_number smallint not null check (round_number between 1 and 20),
  guess_text text not null default '',
  is_correct boolean not null default false,
  submitted_at timestamptz,
  unique (room_id, player_id, round_number)
);

create index idx_players_room on players(room_id);
create index idx_room_words_room on room_words(room_id);
create index idx_drawings_room_round on drawings(room_id, round_number);
create index idx_guesses_room_round on guesses(room_id, round_number);

-- Keep last_activity_at fresh on any write touching a room, so the cleanup
-- job below only reaps genuinely idle rooms.
create or replace function touch_room_activity()
returns trigger
language plpgsql
security definer
as $$
begin
  update rooms set last_activity_at = now()
  where id = coalesce(new.room_id, old.room_id);
  return coalesce(new, old);
end;
$$;

create trigger trg_touch_room_players
  after insert or update or delete on players
  for each row execute function touch_room_activity();

create trigger trg_touch_room_drawings
  after insert or update or delete on drawings
  for each row execute function touch_room_activity();

create trigger trg_touch_room_guesses
  after insert or update or delete on guesses
  for each row execute function touch_room_activity();

create or replace function touch_room_self()
returns trigger
language plpgsql
as $$
begin
  new.last_activity_at = now();
  return new;
end;
$$;

create trigger trg_touch_room_self
  before update on rooms
  for each row
  when (old.* is distinct from new.*)
  execute function touch_room_self();

-- Row level security: open policies gated only by room code knowledge.
alter table rooms enable row level security;
alter table players enable row level security;
alter table words enable row level security;
alter table room_words enable row level security;
alter table drawings enable row level security;
alter table guesses enable row level security;

create policy "rooms are readable" on rooms for select using (true);
create policy "rooms are insertable" on rooms for insert with check (true);
create policy "rooms are updatable" on rooms for update using (true);

create policy "players are readable" on players for select using (true);
create policy "players are insertable" on players for insert with check (true);
create policy "players are updatable" on players for update using (true);
create policy "players are deletable" on players for delete using (true);

create policy "words are readable" on words for select using (true);

create policy "room_words are readable" on room_words for select using (true);
create policy "room_words are insertable" on room_words for insert with check (true);

create policy "drawings are readable" on drawings for select using (true);
create policy "drawings are insertable" on drawings for insert with check (true);
create policy "drawings are updatable" on drawings for update using (true);

create policy "guesses are readable" on guesses for select using (true);
create policy "guesses are insertable" on guesses for insert with check (true);
create policy "guesses are updatable" on guesses for update using (true);

-- Cleanup: delete rooms idle for more than 30 minutes. Requires the
-- pg_cron extension, which on Supabase is enabled via
-- Database -> Extensions -> pg_cron in the dashboard (or
-- `create extension pg_cron;` if you have the privilege).
-- Once enabled, schedule with:
--
--   select cron.schedule(
--     'cleanup-stale-rooms',
--     '*/10 * * * *',
--     $$ delete from rooms where last_activity_at < now() - interval '30 minutes'; $$
--   );
--
-- Left as a manual step since pg_cron activation depends on your
-- Supabase plan/project settings.
