# rateuwclubs

rate UW clubs 1-5 stars. see the leaderboard.

next.js + supabase + tailwind. uses openai for short club descriptions.

## setup

```bash
npm install
```

`.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
```

run the schema from `supabase/schema.sql` in the supabase SQL editor, then seed clubs:

```bash
npx ts-node --esm scripts/seed-all-clubs.ts
```

or scrape live from WUSA (needs playwright):

```bash
npx ts-node --esm scripts/scrape-wusa-clubs.ts
```

```bash
npm run dev
```
