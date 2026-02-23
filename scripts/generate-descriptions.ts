import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
  throw new Error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or OPENAI_API_KEY in env.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const BATCH_SIZE = 5;
const DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const { data: clubs, error } = await supabase
    .from("clubs")
    .select("id, name, description, tags, short_description")
    .order("id");

  if (error) {
    console.error("Failed to fetch clubs:", error.message);
    process.exit(1);
  }

  if (!clubs || clubs.length === 0) {
    console.log("No clubs found.");
    return;
  }

  const needDesc = clubs;
  console.log(`${clubs.length} total clubs, regenerating all descriptions.`);

  let done = 0;
  let failed = 0;

  for (let i = 0; i < needDesc.length; i += BATCH_SIZE) {
    const batch = needDesc.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (club) => {
        const tags = Array.isArray(club.tags) ? club.tags.join(", ") : "";
        const raw = (club.description ?? "").slice(0, 800);

        const prompt = `Summarize what this University of Waterloo student club actually does in 1-2 sentences. Be specific and accurate — use the scraped description as your primary source. If no description is available, write a reasonable summary based on the name and tags. Stay under 150 characters. No links, emojis, quotes, or recruiting language like "join us".

Name: ${club.name}
Tags: ${tags}
Official description: ${raw || "(not available)"}`;

        try {
          const resp = await openai.responses.create({
            model: "gpt-4.1-mini",
            input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
          });

          let summary = (resp.output_text ?? "").trim().replace(/\s+/g, " ");
          if (summary.length > 160) {
            const lastDot = summary.lastIndexOf(".", 160);
            summary = lastDot > 50 ? summary.slice(0, lastDot + 1) : summary.slice(0, 157) + "...";
          }
          return { id: club.id, name: club.name, short_description: summary, ok: true };
        } catch (err: any) {
          console.error(`  ✗ GPT error for "${club.name}": ${err.message}`);
          return { id: club.id, name: club.name, short_description: null, ok: false };
        }
      })
    );

    for (const r of results) {
      if (!r.ok || !r.short_description) {
        failed++;
        continue;
      }

      const { error: updateErr } = await supabase
        .from("clubs")
        .update({
          short_description: r.short_description,
          short_desc_updated_at: new Date().toISOString(),
        })
        .eq("id", r.id);

      if (updateErr) {
        console.error(`  ✗ DB error for "${r.name}": ${updateErr.message}`);
        failed++;
      } else {
        done++;
        console.log(`  ✓ [${done}/${needDesc.length}] ${r.name}`);
      }
    }

    if (i + BATCH_SIZE < needDesc.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nDone. ${done} descriptions written, ${failed} failed.`);
}

main();
