import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// Stores a franchise lead when Supabase is configured. Always returns ok so the
// client can proceed to the WhatsApp confirmation regardless.
interface Body {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  budget?: string;
  hasSpace?: string;
  message?: string;
  utm?: Record<string, string> | null;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  if (!body.name || !body.phone) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ ok: true, tracked: false });
  }

  try {
    const { error } = await supabase.from("franchise_leads").insert({
      name: body.name,
      phone: body.phone,
      email: body.email ?? null,
      city: body.city ?? null,
      budget: body.budget ?? null,
      has_space: body.hasSpace ?? null,
      message: body.message ?? null,
      utm: body.utm ?? null,
      status: "new",
    });
    if (error) return NextResponse.json({ ok: true, tracked: false, warn: error.message });
    return NextResponse.json({ ok: true, tracked: true });
  } catch (e) {
    return NextResponse.json({ ok: true, tracked: false, warn: String(e) });
  }
}
