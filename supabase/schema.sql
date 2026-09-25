create table if not exists habits (
  id uuid default gen_random_uuid () primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  category text default 'General',
  created_at timestamptz default now () not null
);

create table if not exists daily_logs (
  id uuid default gen_random_uuid () primary key,
  habit_id uuid not null references habits (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  completed_at date not null default current_date,
  created_at timestamptz default now () not null,
  unique (habit_id, completed_at)
);

alter table habits enable row level security;
alter table daily_logs enable row level security;

drop policy if exists "Users can manage their own habits" on habits;
create policy "Users can manage their own habits"
  on habits
  for all
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

drop policy if exists "Users can manage their own daily logs" on daily_logs;
create policy "Users can manage their own daily logs"
  on daily_logs
  for all
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);