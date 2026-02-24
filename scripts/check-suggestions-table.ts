import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log("Creating club_suggestions table if it doesn't exist…");

  const { error } = await supabase.rpc("exec_sql", {
    sql: `
      create table if not exists public.club_suggestions (
        id         bigint generated always as identity primary key,
        club_name  text not null,
        created_at timestamptz not null default now()
      );

      alter table public.club_suggestions enable row level security;

      create policy if not exists "suggestions_insert" on public.club_suggestions
        for insert with check (true);
      create policy if not exists "suggestions_select" on public.club_suggestions
        for select using (true);
    `,
  });

  if (error) {
    // If rpc doesn't exist, try direct SQL via REST — fall back to just checking the table
    console.log("RPC not available, checking table via direct query…");

    const { error: tableError } = await supabase
      .from("club_suggestions")
      .select("id")
      .limit(1);

    if (tableError) {
      console.error(
        "❌ Table 'club_suggestions' does not exist yet.",
        "Please run the SQL from supabase/schema.sql in the Supabase dashboard:"
      );
      console.error(`
  create table if not exists public.club_suggestions (
    id         bigint generated always as identity primary key,
    club_name  text not null,
    created_at timestamptz not null default now()
  );

  alter table public.club_suggestions enable row level security;

  create policy "suggestions_insert" on public.club_suggestions
    for insert with check (true);
  create policy "suggestions_select" on public.club_suggestions
    for select using (true);
      `);
      process.exit(1);
    } else {
      console.log("✅ Table 'club_suggestions' already exists.");
    }
  } else {
    console.log("✅ Table created successfully.");
  }

  // Show existing suggestions
  const { data, error: fetchError } = await supabase
    .from("club_suggestions")
    .select("*")
    .order("created_at", { ascending: false });

  if (fetchError) {
    console.error("Error fetching suggestions:", fetchError.message);
  } else {
    console.log(`\n📋 ${data.length} suggestion(s) so far:`);
    for (const row of data) {
      console.log(`  - "${row.club_name}" (${row.created_at})`);
    }
  }
}

main();
