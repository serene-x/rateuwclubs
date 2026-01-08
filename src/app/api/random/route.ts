import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const tag = req.nextUrl.searchParams.get("tag");

  if (tag) {
    const { data, error } = await supabase
      .from("clubs")
      .select("*")
      .contains("tags", [tag]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ club: null });
    }

    const randomClub = data[Math.floor(Math.random() * data.length)];
    return NextResponse.json({ club: randomClub });
  }

  const { data, error } = await supabase.rpc("get_random_club");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ club: data?.[0] ?? null });
}
