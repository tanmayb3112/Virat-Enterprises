import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// Resolves the caller's role from their Supabase access token.
// Role source of truth: the allowed_staff_emails table (admin-managed on
// /admin/settings). Anyone signed in but not on the list is a customer.
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: true, live: false, role: "customer" });

  const auth = req.headers.get("authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return NextResponse.json({ ok: true, live: true, role: "anon" });

  try {
    const { data, error } = await supabase.auth.getUser(jwt);
    const email = data?.user?.email?.toLowerCase();
    if (error || !email) return NextResponse.json({ ok: true, live: true, role: "anon" });

    const { data: row } = await supabase
      .from("allowed_staff_emails")
      .select("role, branch_ids")
      .eq("email", email)
      .maybeSingle();

    const role = row?.role === "admin" ? "admin" : row?.role === "staff" ? "staff" : "customer";
    return NextResponse.json({
      ok: true,
      live: true,
      role,
      email,
      branchIds: row?.branch_ids ?? [],
    });
  } catch {
    return NextResponse.json({ ok: true, live: true, role: "anon" });
  }
}
