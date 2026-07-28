import { NextRequest, NextResponse } from "next/server";
import { requireStaff, canReachBranch } from "@/lib/adminAuth";

// Live order queue for the staff dashboard (/admin).
//
// GET   → the branch-scoped order list, newest first, with its audit trail and
//         any recorded courier booking.
// PATCH → the dashboard's mutations. Every one writes an order_events row
//         stamped with the acting staff email, so the audit trail on the
//         dashboard is the real history rather than a rendering of the current
//         status.
//
// Both go through the service role after the caller is confirmed to be staff,
// and reject an order that belongs to a branch the caller is not pinned to.

export const dynamic = "force-dynamic";

const SELECT = `id, order_no, token, status, total, subtotal, delivery_type, address,
  distance_km, delivery_fee_rule, payment_mode, payment_status, utr_reference,
  guest_name, guest_phone, guest_email, branch_id, items, utm, created_at, completed_at,
  order_events (status, note, actor, created_at),
  deliveries (vendor, tracking_id, courier_fee, booked_at, delivered_at)`;

const STATUSES = [
  "RECEIVED",
  "PAYMENT_PENDING_VERIFICATION",
  "PAID",
  "PRINTING",
  "READY",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
] as const;
type Status = (typeof STATUSES)[number];

function isStatus(s: unknown): s is Status {
  return typeof s === "string" && (STATUSES as readonly string[]).includes(s);
}

export async function GET(req: NextRequest) {
  const ctx = await requireStaff(req);
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "not_staff" }, { status: 403 });
  }
  const { supabase, staff } = ctx;

  let q = supabase
    .from("orders")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(200);

  // Pinned staff see only their branches; admins and unpinned staff see all.
  if (staff.role !== "admin" && staff.branchIds.length > 0) {
    q = q.in("branch_id", staff.branchIds);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    email: staff.email,
    role: staff.role,
    branchIds: staff.branchIds,
    orders: data ?? [],
  });
}

interface PatchBody {
  id: string;
  action: "status" | "verify_payment" | "reprice" | "book_delivery" | "cancel";
  status?: string;
  total?: number;
  pages?: number;
  vendor?: string;
  trackingId?: string;
  courierFee?: number;
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireStaff(req);
  if (!ctx) {
    return NextResponse.json({ ok: false, error: "not_staff" }, { status: 403 });
  }
  const { supabase, staff } = ctx;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  if (!body?.id) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  // Read the order first: the audit note needs the previous state, and the
  // branch check needs its branch.
  const { data: order, error: readErr } = await supabase
    .from("orders")
    .select("id, status, total, branch_id, utr_reference")
    .eq("id", body.id)
    .maybeSingle();
  if (readErr) {
    return NextResponse.json({ ok: false, error: readErr.message }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (!canReachBranch(staff, order.branch_id as string | null)) {
    return NextResponse.json({ ok: false, error: "wrong_branch" }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};
  let note = "";
  let eventStatus = order.status as string;

  switch (body.action) {
    case "status": {
      if (!isStatus(body.status)) {
        return NextResponse.json({ ok: false, error: "bad_status" }, { status: 400 });
      }
      patch.status = body.status;
      eventStatus = body.status;
      note = `Status ${order.status} → ${body.status}`;
      break;
    }

    case "verify_payment": {
      patch.status = "PAID";
      patch.payment_status = "paid";
      eventStatus = "PAID";
      note = order.utr_reference
        ? `Payment verified against UTR ${order.utr_reference}`
        : "Payment verified";
      break;
    }

    case "reprice": {
      const total = Number(body.total);
      if (!Number.isFinite(total) || total < 0) {
        return NextResponse.json({ ok: false, error: "bad_total" }, { status: 400 });
      }
      patch.total = total;
      note =
        `Repriced ${order.total ?? "?"} → ${total}` +
        (body.pages ? ` after verifying ${body.pages} pages` : "");
      break;
    }

    case "book_delivery": {
      patch.status = "OUT_FOR_DELIVERY";
      eventStatus = "OUT_FOR_DELIVERY";
      const vendor = (body.vendor ?? "").slice(0, 40);
      const fee = Number.isFinite(Number(body.courierFee)) ? Number(body.courierFee) : null;
      const { error: delErr } = await supabase.from("deliveries").insert({
        order_id: order.id,
        vendor: vendor || null,
        tracking_id: body.trackingId?.slice(0, 80) || null,
        courier_fee: fee,
        booked_at: new Date().toISOString(),
      });
      // A missing deliveries row must not block the status change — the audit
      // note below still records what was booked.
      note =
        `Out for delivery` +
        (vendor ? ` · ${vendor}` : "") +
        (body.trackingId ? ` · ${body.trackingId}` : "") +
        (fee !== null ? ` · fee ${fee}` : "") +
        (delErr ? ` (booking row not saved: ${delErr.message})` : "");
      break;
    }

    case "cancel": {
      patch.status = "CANCELLED";
      eventStatus = "CANCELLED";
      note = `Cancelled (was ${order.status})`;
      break;
    }

    default:
      return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
  }

  const { error: writeErr } = await supabase.from("orders").update(patch).eq("id", order.id);
  if (writeErr) {
    return NextResponse.json({ ok: false, error: writeErr.message }, { status: 500 });
  }

  // Audit trail. Best-effort: the status change is already committed, and
  // losing a log line must not read back to staff as a failed action.
  const { error: evErr } = await supabase.from("order_events").insert({
    order_id: order.id,
    status: eventStatus,
    note,
    actor: staff.email,
  });

  return NextResponse.json({ ok: true, audit: !evErr });
}
