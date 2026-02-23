# rateuwclubs

A Tinder-style rating app for University of Waterloo clubs. Swipe through random clubs, rate them 1–5 stars, and watch the **aura leaderboard** update in real time.

Built with **Next.js 16**, **Supabase**, **Tailwind CSS 4**, and **OpenAI GPT-4.1-mini** for auto-generated club descriptions.

## Features

- 🎲 Random club card with AI-generated description
- ⭐ 1–5 star rating with instant rank reveal
- 🏆 Bayesian-scored leaderboard
- 🏷️ Auto-tagged clubs (Sports, Culture, Tech, Design Team, etc.)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
```

### 3. Supabase tables

The app expects a `clubs` table (columns: `id`, `name`, `description`, `tags`, `short_description`, `short_desc_updated_at`) and a `votes` table (columns: `id`, `club_id`, `rating`, `created_at`), plus three RPC functions: `get_random_club`, `get_club_rank(target_club_id, m)`, and `get_leaderboard(m)`.

### 4. Seed clubs

**Option A — Scrape WUSA + Sedra live** (requires Playwright):

```bash
npx ts-node --esm scripts/scrape-wusa-clubs.ts
```

**Option B — Seed the full curated list** (no browser needed):

```bash
npx ts-node --esm scripts/seed-all-clubs.ts
```

Both scripts use upsert, so they're safe to re-run.

### 5. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/
    page.tsx            # Main voting card
    leaderboard/
      page.tsx          # Leaderboard
    api/
      random/route.ts   # GET  → random club
      vote/route.ts     # POST → submit rating
      leaderboard/route.ts # GET  → ranked list
      club-summary/route.ts # POST → GPT description (cached)
  lib/
    supabase.ts         # Supabase client
scripts/
  scrape-wusa-clubs.ts  # Playwright scraper (WUSA + Sedra)
  seed-all-clubs.ts     # Manual seed (200+ clubs)
```
