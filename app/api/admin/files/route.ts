import { NextRequest, NextResponse } from "next/server";
import { requireStaff, canReachBranch } from "@/lib/adminAuth";

// Signed download links for an order's print files.
//
// The print-files bucket is private and write-only to the public — nobody can
// read or list it without the service role (see supabase/schema.sql). Staff
// downloads therefore come from here: prove you are staff, name an ORDER (not a
// path, so no browsing the bucket), and get short-lived signed URLs back.
//
// Paths follow the upload convention in the order wizard: <token>/<file_name>.

export const dynamic = "force-dynamic";

const EXPIRES_SECONDS = 300;

export async function POST(req: NextRequest) {
  const ctx = await requireStaff(req);
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "not_staff" }, { status: 403 });
  }
  const { supabase, staff } = ctx;

  let orderId = "";
  try {
    const body = await req.json();
    orderId = String(body?.orderId ?? "");
  } catch {
    // handled below
  }
  if (!orderId) {
    return NextResponse.json({ ok: false, error: "missing_order_id" }, { status: 400 });
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select("token, items, branch_id, files_purged")
    .eq("id", orderId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (!canReachBranch(staff, order.branch_id as string | null)) {
    return NextResponse.json({ ok: false, error: "wrong_branch" }, { status: 403 });
  }
  if (order.files_purged) {
    return NextResponse.json({ ok: false, error: "files_purged" }, { status: 410 });
  }

  const items = (order.items as { file_name?: string }[] | null) ?? [];
  const names = items.map((i) => i.file_name).filter((n): n is string => !!n);
  if (names.length === 0) {
    return NextResponse.json({ ok: true, files: [] });
  }

  const paths = names.map((n) => `${order.token}/${n}`);
  const { data: signed, error: signErr } = await supabase.storage
    .from("print-files")
    .createSignedUrls(paths, EXPIRES_SECONDS);
  if (signErr) {
    return NextResponse.json({ ok: false, error: signErr.message }, { status: 500 });
  }

  // Pair each URL back to its file name. A file the customer never managed to
  // upload signs with an error — surface it as a null url rather than a broken
  // link, so the dashboard can grey the row out.
  const files = names.map((name, i) => ({
    name,
    url: signed?.[i]?.signedUrl ?? null,
    error: signed?.[i]?.error ?? null,
  }));

  return NextResponse.json({ ok: true, files });
}
