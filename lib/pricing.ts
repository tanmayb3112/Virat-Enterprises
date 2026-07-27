// Pricing engine — mirrors the design prototype exactly (handoff README §"Pricing").
// This is the single source of truth for the live price ticker AND the server-side
// bill recomputation. In production the per-unit rates come from the admin-editable
// `rate_card` table; the defaults below match the seeded rate card.

export type PaperSize = "A4" | "A3" | "A5" | "Legal" | "Letter" | "A2" | "A1" | "A0";
export type ColorMode = "bw" | "color";
export type Sides = "single" | "double";
export type Orientation = "portrait" | "landscape";
export type Gsm = "70" | "80" | "100" | "glossy";
export type Nup = 1 | 2 | 4;
export type Binding = "none" | "staple" | "spiral" | "hard" | "rexine";
export type Lamination = "none" | "perpage";

// Jumbo / large-format sizes are priced flat per side (owner's rate card);
// GSM/glossy surcharges don't apply to them.
export const JUMBO_SIZES: PaperSize[] = ["A2", "A1", "A0"];

export interface FilePrefs {
  size: PaperSize;
  color: ColorMode;
  sides: Sides;
  orient: Orientation;
  gsm: Gsm;
  nup: Nup;
  copies: number;
  range: string; // "" = all
  notes: string;
}

export function defaultPrefs(): FilePrefs {
  return {
    size: "A4",
    color: "bw",
    sides: "double",
    orient: "portrait",
    gsm: "70",
    nup: 1,
    copies: 1,
    range: "",
    notes: "",
  };
}

export interface OrderFile {
  id: string;
  name: string;
  ext: string;
  kind: "pdf" | "image" | "office";
  pages: number; // effective page count (0 = unknown/office pending)
  prefs: FilePrefs;
}

// Count selected pages from a range like "1-5, 8". Empty/invalid => all pages.
export function pagesInRange(totalPages: number, range: string): number {
  const r = (range || "").trim();
  if (!r) return totalPages;
  let count = 0;
  for (const part of r.split(",")) {
    const seg = part.trim();
    if (!seg) continue;
    const m = seg.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      const a = Math.max(1, Math.min(totalPages, parseInt(m[1], 10)));
      const b = Math.max(1, Math.min(totalPages, parseInt(m[2], 10)));
      if (b >= a) count += b - a + 1;
    } else if (/^\d+$/.test(seg)) {
      const p = parseInt(seg, 10);
      if (p >= 1 && p <= totalPages) count += 1;
    }
  }
  return count > 0 ? count : totalPages;
}

function perSideRate(prefs: FilePrefs, totalSides: number): number {
  // Jumbo rates from the owner's rate card (per side, flat).
  if (prefs.size === "A0") return prefs.color === "color" ? 120 : 60;
  if (prefs.size === "A1") return prefs.color === "color" ? 80 : 40;
  if (prefs.size === "A2") return prefs.color === "color" ? 60 : 30;
  if (prefs.size === "A3") return prefs.color === "color" ? 20 : 5;
  // A4-class (A4/A5/Legal/Letter)
  if (prefs.color === "color") return 10;
  return totalSides >= 100 ? 1.5 : 2;
}

export interface FileCost {
  pages: number;
  sidesPerCopy: number;
  totalSides: number;
  sheets: number;
  rate: number;
  lineTotal: number;
  hasPages: boolean;
  // What the rate is charged against. Owner's rule for A4-class B/W:
  // single-sided → ₹2 per SIDE; double-sided → ₹2 per SHEET (both sides
  // of one sheet cost the same ₹2). Everything else stays per side.
  chargeUnit: "side" | "sheet";
  chargedUnits: number;
}

export function computeFileCost(f: OrderFile): FileCost {
  const pages = f.pages > 0 ? pagesInRange(f.pages, f.prefs.range) : 0;
  const hasPages = pages > 0;
  const copies = Math.max(1, f.prefs.copies || 1);
  const sidesPerCopy = Math.ceil(pages / f.prefs.nup);
  const totalSides = sidesPerCopy * copies;
  const sheets = Math.ceil(sidesPerCopy / (f.prefs.sides === "double" ? 2 : 1)) * copies;

  // Owner's rule: A4-class B/W double-sided is charged PER SHEET (₹2 covers
  // both sides of a sheet); single-sided is charged per side. Colour, A3 and
  // jumbo sizes remain per side.
  const isA4ClassBw =
    f.prefs.color === "bw" && !JUMBO_SIZES.includes(f.prefs.size) && f.prefs.size !== "A3";
  const chargeUnit: "side" | "sheet" =
    isA4ClassBw && f.prefs.sides === "double" ? "sheet" : "side";
  const chargedUnits = chargeUnit === "sheet" ? sheets : totalSides;

  const rate = perSideRate(f.prefs, chargedUnits);
  let surcharge = 0;
  if (!JUMBO_SIZES.includes(f.prefs.size)) {
    if (f.prefs.gsm === "100") surcharge = 1;
    else if (f.prefs.gsm === "glossy") surcharge = 15;
  }
  const lineTotal = hasPages ? chargedUnits * rate + sheets * surcharge : 0;
  return { pages, sidesPerCopy, totalSides, sheets, rate, lineTotal, hasPages, chargeUnit, chargedUnits };
}

// Blackbook = the shop's standard hard binding; rexine = premium hard binding.
export const BINDING_COST: Record<Binding, number> = {
  none: 0,
  staple: 0,
  spiral: 40,
  hard: 150,
  rexine: 350,
};

export const LAMINATION_PER_SHEET = 20;
export const MIN_ORDER = 20;
export const GST_RATE = 0.18;

export interface BillLine {
  label: string;
  amount: number;
}

export interface OrderCost {
  lines: BillLine[];
  filesTotal: number;
  binding: number;
  lamination: number;
  minTopUp: number;
  subtotal: number; // before GST
  gst: number;
  total: number;
  totalSheets: number;
  filesWithPages: number;
}

export function computeOrder(
  files: OrderFile[],
  binding: Binding,
  lamination: Lamination,
  gstEnabled: boolean
): OrderCost {
  const lines: BillLine[] = [];
  let filesTotal = 0;
  let totalSheets = 0;
  let filesWithPages = 0;

  for (const f of files) {
    const c = computeFileCost(f);
    if (!c.hasPages) continue;
    filesWithPages += 1;
    totalSheets += c.sheets;
    filesTotal += c.lineTotal;
    const unitWord = c.chargeUnit === "sheet" ? "sheets (2 sides each)" : "sides";
    const sideWord = f.prefs.sides === "double" ? "double" : "single";
    lines.push({
      label: `${f.name} — ${c.chargedUnits} ${unitWord} × ₹${c.rate} (${sideWord})`,
      amount: c.lineTotal,
    });
  }

  const bindingCost = BINDING_COST[binding];
  if (bindingCost > 0) {
    const bindingLabel =
      binding === "hard" ? "Blackbook binding" : binding === "rexine" ? "Rexine binding" : `${cap(binding)} binding`;
    lines.push({ label: bindingLabel, amount: bindingCost });
  }

  const laminationCost = lamination === "perpage" ? totalSheets * LAMINATION_PER_SHEET : 0;
  if (laminationCost > 0) {
    lines.push({ label: `Lamination — ${totalSheets} sheets`, amount: laminationCost });
  }

  let subtotal = filesTotal + bindingCost + laminationCost;
  let minTopUp = 0;
  if (filesWithPages > 0 && subtotal < MIN_ORDER) {
    minTopUp = MIN_ORDER - subtotal;
    lines.push({ label: "Minimum order top-up", amount: minTopUp });
    subtotal = MIN_ORDER;
  }

  const gst = gstEnabled ? subtotal * GST_RATE : 0;
  if (gst > 0) lines.push({ label: "GST (18%)", amount: gst });

  const total = subtotal + gst;

  return {
    lines,
    filesTotal,
    binding: bindingCost,
    lamination: laminationCost,
    minTopUp,
    subtotal,
    gst,
    total,
    totalSheets,
    filesWithPages,
  };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Haversine distance in km between two lat/lng points (for the 3km delivery rule).
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isFreeDelivery(
  distanceKm: number,
  orderTotal: number,
  radiusKm: number,
  minOrder: number
): boolean {
  return distanceKm <= radiusKm && orderTotal > minOrder;
}
