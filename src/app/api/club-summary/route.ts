import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // ensures Node runtime (not edge)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only
);

function needsRefresh(updatedAt: string | null) {
  if (!updatedAt) return true;
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  const days = ageMs / (1000 * 60 * 60 * 24);
  return days > 30; // refresh monthly
}

export async function POST(req: Request) {
  try {
    const { clubName } = (await req.json()) as { clubName?: string };
    if (!clubName) return NextResponse.json({ error: "Missing clubName" }, { status: 400 });

    // 1) fetch existing record
    const { data: club, error: fetchErr } = await supabase
      .from("clubs")
      .select("name, description, tags, short_description, short_desc_updated_at")
      .ilike("name", clubName)
      .maybeSingle();

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

    // 2) return cached if present + fresh
    if (club.short_description && !needsRefresh(club.short_desc_updated_at)) {
      return NextResponse.json({ short_description: club.short_description });
    }

    // 3) build prompt using whatever you have
    const tags = Array.isArray(club.tags) ? club.tags.join(", ") : "";
    const raw = (club.description ?? "").slice(0, 800);

    const inputText = `
Write a friendly, neutral 1–2 sentence description for a University of Waterloo student club/team.
No links. No emojis. No quotes. No recruiting language ("join us"). No exaggeration.
If description is missing, infer only from the name and tags.
Keep it under 220 characters.

Name: ${club.name}
Tags: ${tags}
Scraped description (may be empty): ${raw}
`.trim();

    // 4) call OpenAI Responses API
    const resp = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [{ role: "user", content: [{ type: "input_text", text: inputText }] }],
    });

    const summary = (resp.output_text ?? "").trim().replace(/\s+/g, " ");
    const short_description = summary.slice(0, 220);

    // 5) upsert cache
    const { error: updateErr } = await supabase
      .from("clubs")
      .update({
        short_description,
        short_desc_updated_at: new Date().toISOString(),
      })
      .ilike("name", club.name);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({ short_description });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
