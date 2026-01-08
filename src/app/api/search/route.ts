import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const tagsParam = (searchParams.get("tags") ?? "").trim();

  const selectedTags = tagsParam
    ? tagsParam.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  if (q.length < 2 && selectedTags.length === 0) {
    return NextResponse.json({ results: [] });
  }

  let query = supabase
    .from("clubs")
    .select("id, name, tags, short_description, description");

  if (q.length >= 2) {
    const pattern = `%${q}%`;
    query = query.or(
      `name.ilike.${pattern},description.ilike.${pattern},short_description.ilike.${pattern}`,
    );
  }

  if (selectedTags.length > 0) {
    const tagFilter = selectedTags
      .map((tag) => `tags.cs.{${tag}}`)
      .join(",");
    query = query.or(tagFilter);
  }

  const { data: clubs, error } = await query.order("name").limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!clubs || clubs.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const ids = clubs.map((c) => c.id);

  const { data: voteStats } = await supabase
    .from("votes")
    .select("club_id, rating")
    .in("club_id", ids);

  const statsMap = new Map<number, { total: number; sum: number }>();
  for (const v of voteStats ?? []) {
    const s = statsMap.get(v.club_id) ?? { total: 0, sum: 0 };
    s.total++;
    s.sum += v.rating;
    statsMap.set(v.club_id, s);
  }

  const results = clubs.map((c) => {
    const s = statsMap.get(c.id);
    return {
      id: c.id,
      name: c.name,
      tags: c.tags,
      short_description: c.short_description ?? c.description ?? null,
      avg_rating: s ? Math.round((s.sum / s.total) * 2) / 2 : 0,
      vote_count: s?.total ?? 0,
    };
  });

  return NextResponse.json({ results });
}
