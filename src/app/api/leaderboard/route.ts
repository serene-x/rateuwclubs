import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase.rpc("get_leaderboard", { m: 30 });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ leaderboard: [] });
  }

  const ids = rows.map((r: any) => r.club_id);
  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, link")
    .in("id", ids);

  const linkMap = new Map<number, string | null>();
  for (const c of clubs ?? []) linkMap.set(c.id, c.link ?? null);

  const leaderboard = rows.map((r: any) => ({
    ...r,
    link: linkMap.get(r.club_id) ?? null,
  }));

  return NextResponse.json({ leaderboard });
}
