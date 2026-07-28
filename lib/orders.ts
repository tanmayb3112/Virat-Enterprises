"use client";

// Shared shapes and helpers for the two staff screens that read the live order
// queue (/admin and /admin/reports). Both consume the same /api/admin/orders
// payload, so the row types and the item-level derivations live here rather than
// being written twice and drifting.

import { getSupabaseBrowser } from "@/lib/supabase/client";
import { computeFileCost, defaultPrefs, FilePrefs, OrderFile, JUMBO_SIZES } from "@/lib/pricing";

export interface DbItem {
  file_name?: string;
  page_count?: number;
  prefs?: Partial<FilePrefs>;
  line_total?: number;
}
export interface DbEvent {
  status: string | null;
  note: string | null;
  actor: string | null;
  created_at: string;
}
export interface DbDelivery {
  vendor: string | null;
  tracking_id: string | null;
  courier_fee: number | null;
  booked_at: string | null;
  delivered_at: string | null;
}
export interface DbOrder {
  id: string;
  order_no: string;
  token: string;
  status: string;
  total: number | null;
  subtotal: number | null;
  delivery_type: "pickup" | "delivery" | null;
  address: Record<string, unknown> | null;
  distance_km: number | null;
  delivery_fee_rule: string | null;
  payment_mode: string | null;
  payment_status: string | null;
  utr_reference: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  branch_id: string | null;
  binding: string | null;
  lamination: string | null;
  items: DbItem[] | null;
  utm: Record<string, string> | null;
  created_at: string;
  completed_at: string | null;
  order_events: DbEvent[] | null;
  deliveries: DbDelivery[] | null;
}

export const OFFICE_EXT = ["DOC", "DOCX", "XLS", "XLSX", "PPT", "PPTX", "ODT"];

export function extOf(name: string): string {
  const bit = name.split(".").pop() ?? "";
  return bit.toUpperCase().slice(0, 4);
}

// Rebuilds an OrderFile from a stored item so the shared pricing engine can be
// reused for sheet counts and repricing instead of duplicating the arithmetic.
export function toOrderFile(it: DbItem, pagesOverride?: number): OrderFile {
  const prefs: FilePrefs = { ...defaultPrefs(), ...(it.prefs ?? {}) };
  return {
    id: it.file_name ?? "file",
    name: it.file_name ?? "file",
    ext: extOf(it.file_name ?? ""),
    kind: "pdf",
    pages: pagesOverride ?? it.page_count ?? 0,
    prefs,
  };
}

export function describePrefs(prefs: FilePrefs): string {
  const colour = prefs.color === "bw" ? "B/W" : "Colour";
  const gsm = prefs.gsm === "glossy" ? "Glossy" : `${prefs.gsm} GSM`;
  const sides = prefs.sides === "double" ? "Double-sided" : "Single-sided";
  const nup = prefs.nup > 1 ? ` · ${prefs.nup}-up` : "";
  const copies = `${prefs.copies} ${prefs.copies === 1 ? "copy" : "copies"}`;
  return `${prefs.size} · ${colour} · ${sides} · ${gsm}${nup} · ${copies}`;
}

// An order counts as money in the till only once payment is verified — staff
// press "Verify payment" after finding the UPI reference in the bank app.
export function isPaid(o: DbOrder): boolean {
  return o.payment_status === "paid";
}

export function isCancelled(o: DbOrder): boolean {
  return o.status === "CANCELLED";
}

export function orderTotal(o: DbOrder): number {
  return Number(o.total ?? 0);
}

export function sheetsIn(o: DbOrder): number {
  return (o.items ?? []).reduce((n, it) => n + computeFileCost(toOrderFile(it)).sheets, 0);
}

// Which line of the rate card an item belongs to, for the top-services breakdown.
export type ServiceKey =
  | "Large-format / CAD"
  | "Colour printing"
  | "B/W printing"
  | "Binding & finishing"
  | "Lamination";

export function serviceOf(it: DbItem): ServiceKey {
  const prefs: FilePrefs = { ...defaultPrefs(), ...(it.prefs ?? {}) };
  if (JUMBO_SIZES.includes(prefs.size) || prefs.size === "A3") return "Large-format / CAD";
  return prefs.color === "color" ? "Colour printing" : "B/W printing";
}

// One-line description of what the shop actually printed, for report rows.
export function jobSummary(o: DbOrder): string {
  const items = o.items ?? [];
  if (items.length === 0) return "No files";
  const first = items[0];
  const prefs: FilePrefs = { ...defaultPrefs(), ...(first.prefs ?? {}) };
  const pages = first.page_count ?? 0;
  const bits = [
    `${first.file_name ?? "file"}`,
    `${pages ? `${pages} pp ` : ""}${prefs.size} ${prefs.color === "bw" ? "B/W" : "colour"}`,
    prefs.copies > 1 ? `×${prefs.copies}` : "",
  ].filter(Boolean);
  const extra = items.length > 1 ? ` +${items.length - 1} more file` : "";
  const finish = o.binding && o.binding !== "none" ? `, ${o.binding}` : "";
  return `${bits.join(" · ")}${extra}${finish}`;
}

export async function accessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export interface FetchOrdersResult {
  ok: boolean;
  orders: DbOrder[];
  error: string;
}

// Shared loader. `from`/`to` are inclusive calendar dates (YYYY-MM-DD).
export async function fetchOrders(opts: {
  from?: string;
  to?: string;
  limit?: number;
} = {}): Promise<FetchOrdersResult> {
  const token = await accessToken();
  if (!token) {
    return { ok: false, orders: [], error: "Not signed in — reload the page and log in again." };
  }
  const qs = new URLSearchParams();
  if (opts.from) qs.set("from", opts.from);
  if (opts.to) qs.set("to", opts.to);
  if (opts.limit) qs.set("limit", String(opts.limit));

  try {
    const res = await fetch(`/api/admin/orders${qs.size ? `?${qs}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const out = await res.json();
    if (!out.ok) {
      return {
        ok: false,
        orders: [],
        error:
          out.error === "not_staff"
            ? "This account is not on the staff list. Add it in Settings."
            : `Could not load orders: ${out.error ?? res.status}`,
      };
    }
    return { ok: true, orders: out.orders as DbOrder[], error: "" };
  } catch (e) {
    return { ok: false, orders: [], error: `Could not reach the server (${String(e)}).` };
  }
}
