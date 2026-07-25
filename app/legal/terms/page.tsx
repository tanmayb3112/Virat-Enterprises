import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for Virat Enterprises — how orders, quotes, pricing, payment and delivery work for our Pune printing and xerox services.",
};

const h2: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: "#F2F0E9",
  marginTop: 32,
  marginBottom: 10,
  letterSpacing: "-0.01em",
};
const p: React.CSSProperties = {
  fontSize: 15,
  color: "#C9C6BC",
  lineHeight: 1.7,
  margin: "0 0 12px",
};
const ul: React.CSSProperties = {
  fontSize: 15,
  color: "#C9C6BC",
  lineHeight: 1.7,
  margin: "0 0 12px",
  paddingLeft: 20,
};

export default function TermsPage() {
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
          color: "#9A968A",
        }}
      >
        Legal
      </div>
      <h1
        style={{
          fontSize: 40,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "#F2F0E9",
          margin: "12px 0 20px",
          lineHeight: 1.05,
        }}
      >
        Terms of Service
      </h1>

      <div
        style={{
          borderLeft: "2px solid #E8B25C",
          paddingLeft: 16,
          margin: "0 0 28px",
        }}
      >
        <p style={{ fontSize: 14, color: "#E8B25C", lineHeight: 1.6, margin: 0 }}>
          Draft for owner review — please have your advisor confirm before publishing.
        </p>
      </div>

      <p style={p}>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the website and services of
        Virat Enterprises, a proprietor-run printing and xerox business operating six shops in Pune,
        Maharashtra, India (&ldquo;Virat Enterprises&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;).
        By placing an order or otherwise using this website, you agree to these Terms.
      </p>

      <h2 style={h2}>1. About us and our services</h2>
      <p style={p}>
        Virat Enterprises provides printing, photocopying (xerox), binding, lamination, scanning,
        large-format prints and stationery, both over the counter and through online orders placed
        on this website. Orders placed online are fulfilled at the branch you select at checkout.
      </p>

      <h2 style={h2}>2. Orders and quotes</h2>
      <p style={p}>
        You place an order by uploading your files, choosing your print preferences (paper size,
        colour, sides, binding, lamination and so on), selecting a branch and a delivery or pickup
        method, and completing payment. The price shown at checkout is an estimate generated from
        our rate card and the details you provide.
      </p>
      <ul style={ul}>
        <li>
          For PDF and image files, the page count is read automatically in your browser.
        </li>
        <li>
          For office files (Word, Excel, PowerPoint), you tell us the page count. This is treated as
          provisional until the shop opens and verifies the file. If the verified page count differs,
          the final price will be adjusted accordingly and you will be notified before printing.
        </li>
      </ul>

      <h2 style={h2}>3. Pricing</h2>
      <p style={p}>
        Prices are charged as per our published rate card, which may be updated from time to time.
        The rate applied to your order is the one in effect when the order is placed. A minimum order
        value may apply. Where applicable, taxes are shown separately at checkout.
      </p>

      <h2 style={h2}>4. Payment</h2>
      <p style={p}>
        Payment is accepted through UPI and through Razorpay (which supports UPI, cards and
        net-banking). In manual UPI mode you pay to our displayed UPI ID or QR code and submit the
        UPI transaction reference (UTR); your order is confirmed once our staff verify receipt of
        payment. In Razorpay mode, payment is confirmed automatically on successful capture.
      </p>

      <h2 style={h2}>5. Delivery and pickup</h2>
      <ul style={ul}>
        <li>
          <strong>Pickup</strong> from the selected branch is free.
        </li>
        <li>
          <strong>Home delivery</strong> is free within 3 km of the selected branch on orders above
          ₹500.
        </li>
        <li>
          Otherwise, delivery is arranged as a Cash-on-Delivery courier (for example an Uber or
          Rapido parcel) and you pay the delivery partner directly, at actuals, on receipt. Virat
          Enterprises does not collect or refund these courier charges.
        </li>
      </ul>

      <h2 style={h2}>6. Acceptable use</h2>
      <p style={p}>
        You are responsible for the content you upload. You must not use our services to print or
        copy anything that is illegal, or any material protected by copyright, trademark or other
        rights that you do not own or have permission to reproduce. We may refuse or cancel any order
        that we reasonably believe breaches this clause.
      </p>

      <h2 style={h2}>7. Limitation of liability</h2>
      <p style={p}>
        We take care to fulfil every order accurately. To the extent permitted by law, our total
        liability for any order is limited to reprinting the affected items or refunding the amount
        you paid to us for that order. We are not liable for indirect or consequential losses, or for
        delays or defects caused by incorrect files, incorrect specifications provided by you, or by
        the delivery partner.
      </p>

      <h2 style={h2}>8. Governing law and jurisdiction</h2>
      <p style={p}>
        These Terms are governed by the laws of India. The courts at Pune, Maharashtra shall have
        exclusive jurisdiction over any dispute arising from these Terms or your use of our services.
      </p>

      <h2 style={h2}>9. Contact</h2>
      <p style={p}>
        Questions about these Terms? Message us on WhatsApp at +91 98231 41366 or visit any Virat
        Enterprises branch in Pune.
      </p>

      <hr style={{ border: 0, borderTop: "1px solid #2E2E29", margin: "32px 0 16px" }} />
      <p className="mono" style={{ fontSize: 12.5, color: "#9A968A", margin: 0 }}>
        Last updated: July 2026 · Virat Enterprises, Pune · WhatsApp +91 98231 41366
      </p>
    </div>
  );
}
