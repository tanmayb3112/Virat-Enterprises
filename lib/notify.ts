// Order notifications to Virat staff.
//
// EMAIL (automatic): when RESEND_API_KEY is set, every new order emails the
// branch's notification address (from admin settings / branches.notify_email)
// plus ADMIN_EMAILS. Free tier: 100/day — one email per order (spec §12).
//
// WHATSAPP (customer-initiated): the site cannot push WhatsApp messages for
// free — there is no free WhatsApp API. Instead the confirmation screen gives
// the CUSTOMER a one-tap pre-filled message to the branch's WhatsApp number
// with the complete job details; the customer sends it (and attaches files).
// The number used comes from settings (branches.notify_whatsapp) or the
// global NEXT_PUBLIC_WHATSAPP_NUMBER fallback.

interface OrderEmail {
  to: string[];
  orderNo: string;
  branchName: string;
  total: number;
  deliveryType: string;
  custName: string;
  custPhone: string;
  utr?: string;
  itemsSummary: string;
}

export async function sendOrderEmail(o: OrderEmail): Promise<{ sent: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: "no_resend_key" };
  if (o.to.length === 0) return { sent: false, reason: "no_recipients" };

  const from = process.env.RESEND_FROM ?? "Virat Orders <onboarding@resend.dev>";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const body = [
    `New order ${o.orderNo} — ${o.branchName}`,
    ``,
    o.itemsSummary,
    ``,
    `Total: Rs. ${o.total}`,
    `Handover: ${o.deliveryType}`,
    `Payment: ${o.utr ? `UPI UTR ${o.utr} — VERIFY in bank app` : "not provided yet"}`,
    `Customer: ${o.custName} · ${o.custPhone}`,
    ``,
    siteUrl ? `Dashboard: ${siteUrl}/admin` : ``,
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: o.to,
        subject: `🖨 New order ${o.orderNo} · Rs. ${o.total} · ${o.branchName}`,
        text: body,
      }),
    });
    if (!res.ok) return { sent: false, reason: `resend_${res.status}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: String(e) };
  }
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
