-- Run this once in Supabase SQL Editor.
create table if not exists public.favorites (
  user_id uuid references auth.users(id) on delete cascade not null,
  symbol text not null,
  created_at timestamptz default now() not null,
  primary key (user_id, symbol)
);

create table if not exists public.stock_notes (
  user_id uuid references auth.users(id) on delete cascade not null,
  symbol text not null,
  target numeric,
  alert numeric,
  note text default '',
  updated_at timestamptz default now() not null,
  primary key (user_id, symbol)
);

alter table public.favorites enable row level security;
alter table public.stock_notes enable row level security;

create policy "Users manage their own favorites" on public.favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own notes" on public.stock_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
