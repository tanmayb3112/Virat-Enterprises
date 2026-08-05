import { NextRequest, NextResponse } from "next/server";
import { BRANCHES } from "@/lib/data";
import { haversineKm } from "@/lib/pricing";

// Turns the customer's typed address into a real distance from the branch.
//
// This decides money: free delivery is "within N km and above a minimum", so a
// wrong or forgeable distance is revenue. The wizard previously carried a
// hard-coded DEMO_KM table and a slider the customer could drag, which meant
// anyone could claim free delivery on any order.
//
// The key stays server-side deliberately. A NEXT_PUBLIC_ key would be readable
// in the browser and billable by anyone who found it; keeping the call here also
// means the browser cannot influence the distance it gets back.
//
// Without a key configured the route reports notConfigured, and the wizard says
// the shop will confirm the delivery charge rather than promising free delivery.

export const dynamic = "force-dynamic";

interface Body {
  line1?: string;
  area?: string;
  pin?: string;
  branchId?: string;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const branch = BRANCHES.find((b) => b.id === body.branchId);
  if (!branch || branch.lat == null || branch.lng == null) {
    return NextResponse.json({ ok: false, error: "unknown_branch" }, { status: 400 });
  }

  const parts = [body.line1, body.area, body.pin, "Pune", "Maharashtra", "India"]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);
  // Street line plus either an area or a pincode: less than that geocodes to the
  // middle of the city and would quietly grant free delivery.
  if (!body.line1?.trim() || !(body.area?.trim() || body.pin?.trim())) {
    return NextResponse.json({ ok: false, error: "address_incomplete" });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json({ ok: false, error: "not_configured" });
  }

  const url =
    "https://maps.googleapis.com/maps/api/geocode/json" +
    `?address=${encodeURIComponent(parts.join(", "))}` +
    `&components=country:IN` +
    `&key=${key}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = (await res.json()) as {
      status?: string;
      results?: { formatted_address?: string; geometry?: { location?: { lat: number; lng: number } } }[];
      error_message?: string;
    };

    if (data.status !== "OK" || !data.results?.length) {
      // ZERO_RESULTS is a normal outcome for a half-typed address; anything else
      // (REQUEST_DENIED, OVER_QUERY_LIMIT) is worth passing back so the owner can
      // see it while setting the key up.
      return NextResponse.json({
        ok: false,
        error: data.status === "ZERO_RESULTS" ? "not_found" : (data.status ?? "geocode_failed"),
        detail: data.error_message,
      });
    }

    const loc = data.results[0].geometry?.location;
    if (!loc) return NextResponse.json({ ok: false, error: "not_found" });

    const km = haversineKm(branch.lat, branch.lng, loc.lat, loc.lng);
    return NextResponse.json({
      ok: true,
      // Straight-line distance. Road distance is longer, so this is the
      // customer-favourable reading of the free-delivery radius — deliberate,
      // and the shop can still adjust a specific order on the dashboard.
      km: Math.round(km * 10) / 10,
      lat: loc.lat,
      lng: loc.lng,
      formatted: data.results[0].formatted_address ?? "",
      branchId: branch.id,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "geocode_unreachable", detail: String(e) });
  }
}
