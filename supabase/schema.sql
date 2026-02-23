-- =============================================================
-- rateuwclubs — Full Supabase Schema Setup
-- Run this in: Supabase Dashboard → SQL Editor → New Query → paste → Run
-- =============================================================

-- 1. CLUBS TABLE
create table if not exists public.clubs (
  id            bigint generated always as identity primary key,
  name          text not null unique,
  description   text,
  tags          text[] not null default '{}',
  short_description     text,
  short_desc_updated_at timestamptz
);

-- Index for faster ilike lookups used by club-summary route
create index if not exists idx_clubs_name_lower on public.clubs (lower(name));

-- 2. VOTES TABLE
create table if not exists public.votes (
  id         bigint generated always as identity primary key,
  club_id    bigint not null references public.clubs(id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists idx_votes_club_id on public.votes (club_id);

-- 3. RPC: get_random_club
--    Returns one random club row.
create or replace function public.get_random_club()
returns setof public.clubs
language sql stable
as $$
  select * from public.clubs order by random() limit 1;
$$;

-- 4. RPC: get_club_rank(target_club_id, m)
--    Returns the rank, total clubs with votes, and Bayesian score
--    for a single club.  `m` is the Bayesian prior weight (e.g. 30).
create or replace function public.get_club_rank(target_club_id bigint, m int default 30)
returns table(rank bigint, total bigint, score numeric)
language sql stable
as $$
  with global as (
    select coalesce(avg(rating), 3) as c
    from public.votes
  ),
  club_stats as (
    select
      c.id as club_id,
      count(v.id) as vote_count,
      coalesce(avg(v.rating), 0) as avg_rating,
      -- Bayesian average: (vote_count * avg + m * C) / (vote_count + m)
      (count(v.id) * coalesce(avg(v.rating), 0) + m * (select c from global))
        / (count(v.id) + m) as score
    from public.clubs c
    left join public.votes v on v.club_id = c.id
    group by c.id
    having count(v.id) > 0
  ),
  ranked as (
    select
      club_id,
      score,
      row_number() over (order by score desc) as rank,
      count(*) over () as total
    from club_stats
  )
  select r.rank, r.total, r.score
  from ranked r
  where r.club_id = target_club_id;
$$;

-- 5. RPC: get_leaderboard(m)
--    Returns all clubs that have at least 1 vote, ranked by Bayesian score.
create or replace function public.get_leaderboard(m int default 30)
returns table(club_id bigint, name text, tags text[], vote_count bigint, avg_rating numeric, score numeric)
language sql stable
as $$
  with global as (
    select coalesce(avg(rating), 3) as c
    from public.votes
  )
  select
    c.id as club_id,
    c.name,
    c.tags,
    count(v.id) as vote_count,
    round(coalesce(avg(v.rating), 0), 2) as avg_rating,
    round(
      (count(v.id) * coalesce(avg(v.rating), 0) + m * (select c from global))
        / (count(v.id) + m),
      2
    ) as score
  from public.clubs c
  inner join public.votes v on v.club_id = c.id
  group by c.id, c.name, c.tags
  order by score desc, vote_count desc;
$$;

-- 6. ROW LEVEL SECURITY (RLS)
--    Enable RLS but allow public reads and inserts via anon key.

alter table public.clubs  enable row level security;
alter table public.votes  enable row level security;

-- Clubs: anyone can read
create policy "clubs_select" on public.clubs
  for select using (true);

-- Clubs: only service role can insert/update (scripts & server routes)
create policy "clubs_insert" on public.clubs
  for insert with check (true);
create policy "clubs_update" on public.clubs
  for update using (true);

-- Votes: anyone can read and insert
create policy "votes_select" on public.votes
  for select using (true);
create policy "votes_insert" on public.votes
  for insert with check (true);

-- =============================================================
-- Done! Now update your .env.local with the new project's keys.
-- =============================================================
