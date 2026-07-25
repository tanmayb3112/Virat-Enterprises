// Central runtime config + feature flags. Everything degrades gracefully when
// external services are not configured, so the site is fully usable with zero
// secrets (orders/leads fall back to WhatsApp + manual UPI).

export const config = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://virat-enterprises.vercel.app",
  paymentMode: (process.env.NEXT_PUBLIC_PAYMENT_MODE ?? "manual") as "manual" | "razorpay",
  gstEnabled: process.env.NEXT_PUBLIC_GST_ENABLED === "true",
  gstNumber: process.env.GST_NUMBER ?? "",
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "",

  // Owner WhatsApp (used for the no-backend fallback ordering + lead flow).
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919823141366",

  // Free-delivery rule (admin-configurable in production via the branches/settings table).
  freeDeliveryRadiusKm: Number(process.env.NEXT_PUBLIC_FREE_DELIVERY_RADIUS_KM ?? 3),
  freeDeliveryMinOrder: Number(process.env.NEXT_PUBLIC_FREE_DELIVERY_MIN_ORDER ?? 500),
};

// True when Supabase env vars are present — flips the site from "manual/demo"
// mode into full backend mode.
export const hasSupabase =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const modeLabel = hasSupabase
  ? `env: live · pay: ${config.paymentMode}`
  : `env: demo · pay: ${config.paymentMode}`;
