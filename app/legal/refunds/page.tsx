import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description:
    "Refund and cancellation policy for Virat Enterprises print orders in Pune — reprints for shop errors, cancellation before printing, and UPI/Razorpay refund timelines.",
};

const h2: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: "#1A1A1A",
  marginTop: 32,
  marginBottom: 10,
  letterSpacing: "-0.01em",
};
const p: React.CSSProperties = {
  fontSize: 15,
  color: "#55524A",
  lineHeight: 1.7,
  margin: "0 0 12px",
};
const ul: React.CSSProperties = {
  fontSize: 15,
  color: "#55524A",
  lineHeight: 1.7,
  margin: "0 0 12px",
  paddingLeft: 20,
};

export default function RefundsPage() {
  return (
    <div
      className="legal-page"
      style={{ maxWidth: 760, margin: "0 auto", padding: "48px 20px 96px" }}
    >
      <div
        className="mono"
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#8A8578",
        }}
      >
        Legal
      </div>
      <h1
        style={{
          fontSize: 40,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "#1A1A1A",
          margin: "12px 0 20px",
          lineHeight: 1.05,
        }}
      >
        Refund &amp; Cancellation Policy
      </h1>

      <div style={{ borderLeft: "2px solid #8A5A22", paddingLeft: 16, margin: "0 0 28px" }}>
        <p style={{ fontSize: 14, color: "#8A5A22", lineHeight: 1.6, margin: 0 }}>
          Draft for owner review — please have your advisor confirm before publishing.
        </p>
      </div>

      <p style={p}>
        This policy explains when Virat Enterprises, a proprietor-run printing and xerox business in
        Pune, offers cancellations, reprints and refunds for orders placed through this website.
        Because our work is custom-printed to your specification, some limits apply.
      </p>

      <h2 style={h2}>1. Custom-printed items</h2>
      <p style={p}>
        Printing is a made-to-order service. Once printing of your order has started, the printed
        items cannot be resold and are therefore non-refundable, except where the fault is ours as
        described below.
      </p>

      <h2 style={h2}>2. Reprints and refunds for our errors</h2>
      <p style={p}>
        If your order arrives with a shop error or a defective print — for example the wrong paper
        size or colour, missing pages, or poor print quality caused by us — we will reprint the
        affected items free of charge, or refund the amount paid for them.
      </p>
      <ul style={ul}>
        <li>Report the issue within 48 hours of receiving your order.</li>
        <li>Quote your order number and, where possible, share a photo of the defect.</li>
      </ul>
      <p style={p}>
        This does not cover errors in the files or specifications you provided (for example a typo in
        your document or the wrong page range selected at checkout).
      </p>

      <h2 style={h2}>3. Cancellation before printing</h2>
      <p style={p}>
        You may cancel an order any time before printing has started, and we will refund what you
        have paid to us in full. Once printing has begun, the order can no longer be cancelled.
      </p>

      <h2 style={h2}>4. How refunds are processed</h2>
      <p style={p}>
        Approved refunds are made back to your original payment method. For UPI and Razorpay
        payments the refund is initiated to the same UPI ID, card or bank account used for the order.
        Refunds typically reflect in your account within 5 to 7 business days, depending on your bank
        or payment provider.
      </p>

      <h2 style={h2}>5. Delivery charges</h2>
      <p style={p}>
        Where delivery is arranged as a Cash-on-Delivery courier, those charges are paid by you
        directly to the delivery partner and are not collected by Virat Enterprises. As such, courier
        charges are not refundable by us.
      </p>

      <h2 style={h2}>6. Contact</h2>
      <p style={p}>
        To request a cancellation, reprint or refund, message us on WhatsApp at +91 98231 41366 with
        your order number, or visit the branch that fulfilled your order.
      </p>

      <hr style={{ border: 0, borderTop: "1px solid #E7E4DC", margin: "32px 0 16px" }} />
      <p className="mono" style={{ fontSize: 12.5, color: "#8A8578", margin: 0 }}>
        Last updated: July 2026 · Virat Enterprises, Pune · WhatsApp +91 98231 41366
      </p>
    </div>
  );
}
