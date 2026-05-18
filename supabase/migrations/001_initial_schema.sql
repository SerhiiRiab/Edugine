-- ============================================================
-- Edugine — Initial Schema
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- HELPERS
-- ============================================================

-- Generates a 6-character session code (no 0/O/1/I to avoid confusion)
create or replace function generate_session_code()
returns text language plpgsql as $$
declare
  chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i      int;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

-- Auto-updates updated_at timestamp
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- PROFILES
-- ============================================================

create table profiles (
  id         uuid primary key references auth.users on delete cascade,
  email      text not null,
  full_name  text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Auto-create profile on new user signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- MECHANICS REGISTRY
-- ============================================================

create table mechanics (
  id          text primary key,         -- e.g. 'swipe_battle'
  name        text not null,
  description text,
  config_schema jsonb,                  -- JSON Schema for the mechanic's config
  created_at  timestamptz not null default now()
);

-- Seed the first mechanic
insert into mechanics (id, name, description) values
  ('swipe_battle', 'Vocabulary Swipe Battle', 'Students swipe cards left (wrong) or right (correct) to test vocabulary knowledge.');

-- ============================================================
-- CONTENT SETS
-- ============================================================

create table content_sets (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles(id) on delete cascade,
  mechanic_id text not null references mechanics(id) on delete restrict,
  title       text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger content_sets_updated_at
  before update on content_sets
  for each row execute function set_updated_at();

create index content_sets_owner_idx on content_sets(owner_id);

-- ============================================================
-- CONTENT ITEMS (Universal — mechanic-specific data in JSONB)
-- ============================================================

create table content_items (
  id         uuid primary key default gen_random_uuid(),
  set_id     uuid not null references content_sets(id) on delete cascade,
  position   int  not null default 0,  -- display order
  data       jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index content_items_set_idx on content_items(set_id, position);

-- ============================================================
-- SESSIONS
-- ============================================================

create table sessions (
  id          uuid primary key default gen_random_uuid(),
  host_id     uuid not null references profiles(id) on delete cascade,
  mechanic_id text not null references mechanics(id) on delete restrict,
  set_id      uuid not null references content_sets(id) on delete restrict,
  code        text not null unique default generate_session_code(),
  status      text not null default 'waiting'
                check (status in ('waiting', 'active', 'paused', 'finished')),
  config      jsonb not null default '{}',  -- mechanic-specific runtime config
  started_at  timestamptz,
  finished_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger sessions_updated_at
  before update on sessions
  for each row execute function set_updated_at();

create index sessions_code_idx   on sessions(code);
create index sessions_host_idx   on sessions(host_id);
create index sessions_status_idx on sessions(status);

-- ============================================================
-- SESSION PARTICIPANTS
-- ============================================================

create table session_participants (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references sessions(id) on delete cascade,
  nickname     text not null,
  score        int  not null default 0,
  joined_at    timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),

  unique (session_id, nickname)
);

create index session_participants_session_idx on session_participants(session_id);

-- ============================================================
-- SESSION EVENTS (append-only event log for realtime + replay)
-- ============================================================

create table session_events (
  id           bigint generated always as identity primary key,
  session_id   uuid not null references sessions(id) on delete cascade,
  participant_id uuid references session_participants(id) on delete set null,
  event_type   text not null,           -- e.g. 'swipe', 'score_update', 'session_end'
  payload      jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

create index session_events_session_idx on session_events(session_id, created_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles             enable row level security;
alter table mechanics            enable row level security;
alter table content_sets         enable row level security;
alter table content_items        enable row level security;
alter table sessions             enable row level security;
alter table session_participants enable row level security;
alter table session_events       enable row level security;

-- PROFILES: users manage only their own profile
create policy "profiles_select_own"  on profiles for select  using (auth.uid() = id);
create policy "profiles_update_own"  on profiles for update  using (auth.uid() = id);

-- MECHANICS: public read (needed for unauthenticated player views)
create policy "mechanics_read_all"   on mechanics for select using (true);

-- CONTENT SETS: owner has full access
create policy "content_sets_owner_all" on content_sets
  for all using (auth.uid() = owner_id);

-- CONTENT ITEMS: access follows the parent content_set's owner
create policy "content_items_owner_all" on content_items
  for all using (
    exists (
      select 1 from content_sets cs
      where cs.id = content_items.set_id
        and cs.owner_id = auth.uid()
    )
  );

-- SESSIONS: host has full access; anyone can read by code (for /play page)
create policy "sessions_host_all" on sessions
  for all using (auth.uid() = host_id);

create policy "sessions_read_by_code" on sessions
  for select using (true);  -- code is the "secret"; read is safe

-- SESSION PARTICIPANTS: anyone can insert (join) and read
create policy "participants_insert_anyone" on session_participants
  for insert with check (true);

create policy "participants_read_anyone" on session_participants
  for select using (true);

create policy "participants_update_own" on session_participants
  for update using (true);  -- score updates come from server-side logic

-- SESSION EVENTS: anyone can insert (client events) and read
create policy "events_insert_anyone" on session_events
  for insert with check (true);

create policy "events_read_anyone" on session_events
  for select using (true);
