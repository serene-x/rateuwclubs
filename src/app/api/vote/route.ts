import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const { clubId, rating } = await req.json();

  if (!clubId || !rating || rating < 0.5 || rating > 5 || rating % 0.5 !== 0) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { error } = await supabase.from("votes").insert({
    club_id: clubId,
    rating,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: rankData } = await supabase.rpc("get_club_rank", {
    target_club_id: clubId,
    m: 30,
  });

  return NextResponse.json({ rankInfo: rankData?.[0] ?? null });
}
