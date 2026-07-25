import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// Free-tier guardrail (spec §12) + owner requirement: print files are deleted
// from Supabase Storage 7 DAYS AFTER the order completes (or is cancelled).
// Order records and invoices are kept — only the uploaded files go.
//
// Wired to Vercel Cron (see vercel.json) — runs once a day. Protected by
// CRON_SECRET when set (Vercel sends it as a Bearer token automatically).

export const dynamic = "force-dynamic";

const RETENTION_DAYS = 7;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    // No backend configured — nothing stored, nothing to clean.
    return NextResponse.json({ ok: true, cleaned: 0, note: "supabase not configured" });
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Orders finished more than RETENTION_DAYS ago whose files still exist.
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, order_no, status, completed_at")
      .in("status", ["COMPLETED", "CANCELLED"])
      .lt("completed_at", cutoff)
      .eq("files_purged", false)
      .limit(100);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    let cleaned = 0;
    for (const order of orders ?? []) {
      // List every file under print-files/{order_id}/ and remove them.
      const { data: files } = await supabase.storage.from("print-files").list(order.id);
      if (files && files.length > 0) {
        const paths = files.map((f) => `${order.id}/${f.name}`);
        const { error: rmError } = await supabase.storage.from("print-files").remove(paths);
        if (rmError) continue; // retry on the next run
      }
      await supabase
        .from("orders")
        .update({ files_purged: true })
        .eq("id", order.id);
      await supabase.from("order_events").insert({
        order_id: order.id,
        status: order.status,
        note: `Print files auto-deleted (${RETENTION_DAYS}-day retention)`,
        actor: "system/cron",
      });
      cleaned += 1;
    }

    return NextResponse.json({ ok: true, cleaned, cutoff });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
