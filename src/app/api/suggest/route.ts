import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const { clubName } = await req.json();

  if (!clubName || typeof clubName !== "string" || clubName.trim().length < 2) {
    return NextResponse.json(
      { error: "Please enter a valid club name." },
      { status: 400 }
    );
  }

  const name = clubName.trim().slice(0, 200);

  const { error } = await supabase
    .from("club_suggestions")
    .insert({ club_name: name });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
