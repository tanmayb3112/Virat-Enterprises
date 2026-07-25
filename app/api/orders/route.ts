import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { branchCode } from "@/lib/whatsapp";

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

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const { orderNo, token } = genOrderNo(body.branchName || "VIR");
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    // Demo / manual mode — no persistence. Client falls back to WhatsApp.
    return NextResponse.json({ ok: true, orderNo, token, tracked: false });
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
      return NextResponse.json({ ok: true, orderNo, token, tracked: false, warn: error.message });
    }
    return NextResponse.json({ ok: true, orderNo, token, tracked: true });
  } catch (e) {
    return NextResponse.json({ ok: true, orderNo, token, tracked: false, warn: String(e) });
  }
}
