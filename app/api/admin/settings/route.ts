import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { BRANCHES } from "@/lib/data";

// Admin settings: per-branch notification contacts + staff login allowlist.
//
// GET  → current settings (from Supabase when configured, else seed defaults).
// POST → save. When Supabase is live, writes require the ADMIN_PASSCODE env
// value (interim guard until Supabase Auth staff logins land — spec §3). In
// demo mode (no Supabase) nothing persists server-side; the page says so.

interface BranchSetting {
  id: string;
  name: string;
  notifyEmail: string;
  notifyWhatsapp: string;
  phone: string;
}

interface StaffEmail {
  email: string;
  role: "staff" | "admin";
  branchIds: string[];
}

interface SettingsPayload {
  branches: BranchSetting[];
  staff: StaffEmail[];
  passcode?: string;
}

function seedSettings(): { branches: BranchSetting[]; staff: StaffEmail[] } {
  return {
    branches: BRANCHES.map((b) => ({
      id: b.id,
      name: b.name,
      notifyEmail: "",
      notifyWhatsapp: "",
      phone: b.phone,
    })),
    staff: [],
  };
}

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ ok: true, live: false, ...seedSettings() });
  }

  try {
    const [{ data: branches }, { data: staff }] = await Promise.all([
      supabase.from("branches").select("id,name,notify_email,notify_whatsapp,phone").order("id"),
      supabase.from("allowed_staff_emails").select("email,role,branch_ids"),
    ]);
    return NextResponse.json({
      ok: true,
      live: true,
      branches: (branches ?? []).map((b) => ({
        id: b.id,
        name: b.name,
        notifyEmail: b.notify_email ?? "",
        notifyWhatsapp: b.notify_whatsapp ?? "",
        phone: b.phone ?? "",
      })),
      staff: (staff ?? []).map((s) => ({
        email: s.email,
        role: (s.role as "staff" | "admin") ?? "staff",
        branchIds: s.branch_ids ?? [],
      })),
    });
  } catch {
    return NextResponse.json({ ok: true, live: false, ...seedSettings() });
  }
}

export async function POST(req: NextRequest) {
  let body: SettingsPayload;
  try {
    body = (await req.json()) as SettingsPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    // Demo mode: accept but be explicit that nothing was stored server-side.
    return NextResponse.json({ ok: true, persisted: false, note: "no database configured yet" });
  }

  // Interim write-guard until Supabase Auth logins: a shared passcode set in
  // the ADMIN_PASSCODE env var. If unset, writes are refused in live mode.
  const passcode = process.env.ADMIN_PASSCODE;
  if (!passcode) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_PASSCODE env var not set — writes disabled" },
      { status: 403 }
    );
  }
  if (body.passcode !== passcode) {
    return NextResponse.json({ ok: false, error: "wrong_passcode" }, { status: 403 });
  }

  try {
    for (const b of body.branches ?? []) {
      await supabase
        .from("branches")
        .update({
          notify_email: b.notifyEmail || null,
          notify_whatsapp: b.notifyWhatsapp || null,
          phone: b.phone || null,
        })
        .eq("id", b.id);
    }

    // Replace the allowlist with the submitted set (small table; simplest safe sync).
    const emails = (body.staff ?? []).filter((s) => s.email.includes("@"));
    await supabase.from("allowed_staff_emails").delete().neq("email", "");
    if (emails.length > 0) {
      await supabase.from("allowed_staff_emails").insert(
        emails.map((s) => ({
          email: s.email.trim().toLowerCase(),
          role: s.role === "admin" ? "admin" : "staff",
          branch_ids: s.branchIds ?? [],
        }))
      );
    }

    return NextResponse.json({ ok: true, persisted: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
