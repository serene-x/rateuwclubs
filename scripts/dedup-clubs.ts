import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function normaliseKey(name: string): string {
  let s = name.toLowerCase().trim();

  // strip parenthetical abbreviations
  s = s.replace(/\s*\([^)]*\)\s*/g, " ");

  // strip common prefixes / suffixes
  const strips = [
    /^uw\s+/,
    /^university\s+of\s+waterloo\s+/,
    /^waterloo\s+/,
    /^uwaterloo\s+/,
    /\s+uw$/,
    /\s+at\s+waterloo\s+university$/,
    /\s+at\s+uw$/,
    /\s+uwaterloo$/,
    /\s+club$/,
    /\s+team$/,
    /,\s*uw$/,
  ];

  for (const re of strips) {
    s = s.replace(re, "");
  }

  // collapse whitespace + trim
  s = s.replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();

  return s;
}

async function main() {
  // Fetch all clubs
  const { data: clubs, error } = await supabase
    .from("clubs")
    .select("id, name, description, tags")
    .order("id", { ascending: true });

  if (error) throw error;
  if (!clubs || clubs.length === 0) {
    console.log("No clubs found.");
    return;
  }

  console.log(`Total clubs in DB: ${clubs.length}\n`);

  // Group by normalised key
  const groups = new Map<string, typeof clubs>();

  for (const club of clubs) {
    const key = normaliseKey(club.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(club);
  }

  // Find groups with more than one entry
  const dupes = [...groups.entries()].filter(([, g]) => g.length > 1);

  if (dupes.length === 0) {
    console.log("✅ No duplicates found!");
    return;
  }

  console.log(`Found ${dupes.length} duplicate group(s):\n`);

  const idsToDelete: number[] = [];

  for (const [key, group] of dupes) {
    // Score each entry: prefer one with description + more tags
    const scored = group
      .map((c) => ({
        ...c,
        score:
          (c.description ? c.description.length : 0) +
          (c.tags ? c.tags.length * 50 : 0),
      }))
      .sort((a, b) => b.score - a.score);

    const keep = scored[0];
    const remove = scored.slice(1);

    console.log(`  Key: "${key}"`);
    console.log(`    KEEP:   [${keep.id}] ${keep.name}`);
    for (const r of remove) {
      console.log(`    DELETE: [${r.id}] ${r.name}`);
      idsToDelete.push(r.id);
    }
    console.log();
  }

  if (idsToDelete.length === 0) {
    console.log("Nothing to delete.");
    return;
  }

  console.log(`Deleting ${idsToDelete.length} duplicate(s)...`);

  // Delete in chunks
  const chunkSize = 50;
  for (let i = 0; i < idsToDelete.length; i += chunkSize) {
    const chunk = idsToDelete.slice(i, i + chunkSize);
    const { error: delErr } = await supabase
      .from("clubs")
      .delete()
      .in("id", chunk);

    if (delErr) {
      console.error("Delete error:", delErr);
      throw delErr;
    }
  }

  // Final count
  const { count } = await supabase
    .from("clubs")
    .select("id", { count: "exact", head: true });

  console.log(`\n✅ Done! ${idsToDelete.length} duplicates removed. ${count} clubs remaining.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
