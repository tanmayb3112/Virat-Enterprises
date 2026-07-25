import { config } from "@/lib/config";
import { inr } from "@/lib/format";
import type { OrderFile } from "@/lib/pricing";
import { computeFileCost } from "@/lib/pricing";

// Builds a wa.me deep link with a fully formatted order so the shop receives
// every print spec even when no backend is configured. The customer attaches
// the actual files in the same WhatsApp chat. This is the zero-backend path
// that makes the site take real orders from day one.
export interface OrderPayload {
  orderNo: string;
  branchName: string;
  files: OrderFile[];
  binding: string;
  lamination: string;
  deliveryType: "pickup" | "delivery";
  address?: string;
  distanceKm?: number;
  freeDelivery?: boolean;
  total: number;
  utr?: string;
  custName: string;
  custPhone: string;
}

function specLine(f: OrderFile): string {
  const c = computeFileCost(f);
  const p = f.prefs;
  const bits = [
    p.size,
    p.color === "color" ? "colour" : "B/W",
    p.sides === "double" ? "double-sided" : "single-sided",
    `${p.copies} cop${p.copies > 1 ? "ies" : "y"}`,
  ];
  if (p.nup > 1) bits.push(`${p.nup}-up`);
  if (p.gsm !== "70") bits.push(`${p.gsm} gsm`);
  if (p.range) bits.push(`pages ${p.range}`);
  let line = `• ${f.name} (${f.pages || "?"} pg) — ${bits.join(", ")} = ${inr(c.lineTotal)}`;
  if (p.notes) line += `\n   note: ${p.notes}`;
  return line;
}

export function buildOrderWhatsappUrl(o: OrderPayload): string {
  const lines: string[] = [];
  lines.push(`*New print order — ${o.orderNo}*`);
  lines.push(`Branch: ${o.branchName}`);
  lines.push("");
  lines.push("*Files:*");
  o.files.forEach((f) => lines.push(specLine(f)));
  if (o.binding !== "none") lines.push(`Binding: ${o.binding}`);
  if (o.lamination !== "none") lines.push(`Lamination: per page`);
  lines.push("");
  if (o.deliveryType === "delivery") {
    lines.push(`*Delivery* to: ${o.address ?? "(address in chat)"}`);
    if (typeof o.distanceKm === "number") lines.push(`Distance: ${o.distanceKm.toFixed(1)} km`);
    lines.push(o.freeDelivery ? "Free delivery (within rule)" : "COD courier — customer pays partner");
  } else {
    lines.push(`*Pickup* from ${o.branchName}`);
  }
  lines.push("");
  lines.push(`*Total: ${inr(o.total)}*`);
  if (o.utr) lines.push(`UPI ref/UTR: ${o.utr}`);
  lines.push(`Name: ${o.custName} · ${o.custPhone}`);
  lines.push("");
  lines.push("_I will attach the files here._");
  return `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export function buildLeadWhatsappUrl(name: string, phone: string, budget: string): string {
  const text = `Hi Virat Enterprises, I'm interested in a franchise.\nName: ${name}\nPhone: ${phone}\nBudget: ${budget}`;
  return `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

// Branch code for invoice / order numbers, e.g. "Mukund Nagar" -> "MUK".
export function branchCode(name: string): string {
  return name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "VIR";
}
