import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { branchCode } from "@/lib/whatsapp";
import { sendOrderEmail, adminEmails } from "@/lib/notify";

// Persists an order when Supabase is configured; otherwise returns a generated
// order number so the client can still show a confirmation + WhatsApp handoff.
// Files themselves are handed over via WhatsApp in the zero-backend path; when
// Supabase Storage is configured the client uploads directly with a signed URL.

interface Body {
  branchId: string;
  branchName: string;
  items: unknown[];
  binding: string;
  lamination: string;
  deliveryType: "pickup" | "delivery";
  address?: Record<string, unknown> | null;
  distanceKm?: number | null;
  freeDelivery?: boolean;
  subtotal: number;
  total: number;
  utr?: string;
  custName: string;
  custPhone: string;
  custEmail?: string;
  utm?: Record<string, string> | null;
}

function genOrderNo(branchName: string): { orderNo: string; token: string } {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rnd = Math.floor(1000 + Math.random() * 9000);
  const token = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  return { orderNo: `VE-${branchCode(branchName)}-${ym}-${rnd}`, token };
}

// Public order lookup by token (for the /order/[token] tracker page).
// Returns { order: null } when Supabase isn't configured or nothing matches.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ ok: false, error: "missing_token" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ ok: true, order: null, tracked: false });

  try {
    const { data, error } = await supabase
      .from("orders")
      .select("order_no,status,delivery_type,total,created_at,branch_id")
      .eq("token", token)
      .maybeSingle();
    if (error || !data) return NextResponse.json({ ok: true, order: null, tracked: false });
    return NextResponse.json({ ok: true, order: data, tracked: true });
  } catch {
    return NextResponse.json({ ok: true, order: null, tracked: false });
  }
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const { orderNo, token } = genOrderNo(body.branchName || "VIR");
  const supabase = getSupabaseAdmin();

  // Staff email notification — awaited (serverless would kill a dangling
  // promise) but errors never block the order.
  // Recipients: the branch's notify_email (from admin settings) + ADMIN_EMAILS.
  // The branch's configured WhatsApp (admin settings) — returned to the client
  // so the customer's order message opens to the right branch number.
  let branchWhatsapp: string | null = null;

  const notifyStaff = async () => {
    const to = new Set(adminEmails());
    if (supabase && body.branchId) {
      const { data } = await supabase
        .from("branches")
        .select("notify_email,notify_whatsapp")
        .eq("id", body.branchId)
        .maybeSingle();
      if (data?.notify_email) to.add(data.notify_email);
      if (data?.notify_whatsapp) branchWhatsapp = data.notify_whatsapp;
    }
    const itemsSummary = (body.items as { file_name?: string; page_count?: number }[] | undefined)
      ?.map((i) => `• ${i.file_name ?? "file"} (${i.page_count ?? "?"} pg)`)
      .join("\n") ?? "";
    await sendOrderEmail({
      to: Array.from(to),
      orderNo,
      branchName: body.branchName,
      total: body.total,
      deliveryType: body.deliveryType,
      custName: body.custName,
      custPhone: body.custPhone,
      utr: body.utr,
      itemsSummary,
    });
  };

  if (!supabase) {
    // Demo / manual mode — no persistence. Client falls back to WhatsApp.
    await notifyStaff().catch(() => {});
    return NextResponse.json({ ok: true, orderNo, token, tracked: false, whatsapp: branchWhatsapp });
  }

  try {
    const { error } = await supabase.from("orders").insert({
      order_no: orderNo,
      token,
      branch_id: body.branchId || null,
      status: body.utr ? "PAYMENT_PENDING_VERIFICATION" : "RECEIVED",
      delivery_type: body.deliveryType,
      address: body.address ?? null,
      distance_km: body.distanceKm ?? null,
      delivery_fee_rule: body.freeDelivery ? "free" : "cod_actuals",
      subtotal: body.subtotal,
      total: body.total,
      payment_mode: "manual",
      payment_status: body.utr ? "pending_verification" : "unpaid",
      utr_reference: body.utr ?? null,
      guest_name: body.custName,
      guest_phone: body.custPhone,
      guest_email: body.custEmail ?? null,
      utm: body.utm ?? null,
      items: body.items,
    });
    if (error) {
      // Table may not exist yet — still let the customer complete via WhatsApp.
      await notifyStaff().catch(() => {});
      return NextResponse.json({ ok: true, orderNo, token, tracked: false, whatsapp: branchWhatsapp, warn: error.message });
    }
    await notifyStaff().catch(() => {});
    return NextResponse.json({ ok: true, orderNo, token, tracked: true, whatsapp: branchWhatsapp });
  } catch (e) {
    return NextResponse.json({ ok: true, orderNo, token, tracked: false, warn: String(e) });
  }
}
