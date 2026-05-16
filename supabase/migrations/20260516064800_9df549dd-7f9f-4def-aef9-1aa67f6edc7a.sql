
-- Shifts table: one row per active shift (code is the join key)
create table public.shifts (
  code text primary key check (code ~ '^[0-9]{6}$'),
  host_username text not null,
  shift_id text not null default gen_random_uuid()::text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

-- Users participating in a shift, with their current totals snapshot
create table public.shift_users (
  shift_code text not null references public.shifts(code) on delete cascade,
  username text not null,
  is_host boolean not null default false,
  totals jsonb not null default '{}'::jsonb,
  last_seen timestamptz not null default now(),
  primary key (shift_code, username)
);

create index shift_users_last_seen_idx on public.shift_users(shift_code, last_seen desc);

-- RLS: anon may read/write using only the shift code (no auth)
alter table public.shifts enable row level security;
alter table public.shift_users enable row level security;

create policy "anon read shifts"   on public.shifts       for select using (true);
create policy "anon insert shifts" on public.shifts       for insert with check (true);
create policy "anon update shifts" on public.shifts       for update using (true) with check (true);
create policy "anon delete shifts" on public.shifts       for delete using (true);

create policy "anon read users"    on public.shift_users  for select using (true);
create policy "anon insert users"  on public.shift_users  for insert with check (true);
create policy "anon update users"  on public.shift_users  for update using (true) with check (true);
create policy "anon delete users"  on public.shift_users  for delete using (true);

-- Realtime
alter publication supabase_realtime add table public.shift_users;
alter publication supabase_realtime add table public.shifts;
alter table public.shift_users replica identity full;
alter table public.shifts replica identity full;
