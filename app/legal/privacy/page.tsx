import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Virat Enterprises — what data we collect when you order prints in Pune, how we use it, where it is stored, and your rights.",
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

export default function PrivacyPage() {
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
        Privacy Policy
      </h1>

      <div style={{ borderLeft: "2px solid #8A5A22", paddingLeft: 16, margin: "0 0 28px" }}>
        <p style={{ fontSize: 14, color: "#8A5A22", lineHeight: 1.6, margin: 0 }}>
          Draft for owner review — please have your advisor confirm before publishing.
        </p>
      </div>

      <p style={p}>
        This Privacy Policy explains how Virat Enterprises, a proprietor-run printing and xerox
        business in Pune, Maharashtra, collects and uses your information when you use this website
        to place print orders or enquire about our franchise.
      </p>

      <h2 style={h2}>1. Information we collect</h2>
      <ul style={ul}>
        <li>
          <strong>Contact and order details:</strong> your name, phone number, email address and
          delivery address.
        </li>
        <li>
          <strong>Uploaded print files:</strong> the documents and images you upload for printing.
        </li>
        <li>
          <strong>Payment reference:</strong> UPI transaction reference (UTR) or the payment
          identifier returned by our payment provider. We do not store your card or bank
          credentials.
        </li>
        <li>
          <strong>Analytics and campaign data:</strong> UTM parameters and usage analytics collected
          through Meta Pixel and Vercel Analytics.
        </li>
      </ul>

      <h2 style={h2}>2. How we use your information</h2>
      <p style={p}>
        We use your information to process and fulfil your print orders, verify payment, arrange
        delivery or pickup, send order updates and invoices, respond to franchise enquiries, and
        understand how our ads and website perform so we can improve our service.
      </p>

      <h2 style={h2}>3. Where your data is stored</h2>
      <p style={p}>
        Your order data and uploaded files are stored on Supabase, our database and file-storage
        provider. Uploaded print files are held in a private storage bucket accessible only to
        authorised staff through time-limited links.
      </p>

      <h2 style={h2}>4. Deletion of uploaded files</h2>
      <p style={p}>
        To protect your privacy, uploaded print files are automatically deleted 7 days after your
        order is completed or cancelled. Invoice records are retained for accounting and tax
        purposes.
      </p>

      <h2 style={h2}>5. Sharing and third parties</h2>
      <p style={p}>
        We do not sell your personal data. We share the minimum information necessary with service
        providers who help us operate, including:
      </p>
      <ul style={ul}>
        <li>
          <strong>Razorpay</strong> — payment processing.
        </li>
        <li>
          <strong>Resend</strong> — sending order and invoice emails.
        </li>
        <li>
          <strong>Courier partners</strong> — to deliver your order (they receive your name, phone
          and delivery address only).
        </li>
      </ul>

      <h2 style={h2}>6. Cookies and pixel tracking</h2>
      <p style={p}>
        We use cookies and the Meta Pixel to measure the performance of our Facebook and Instagram
        ads and to improve your experience. You can control cookies through your browser settings;
        disabling them will not stop you from placing an order.
      </p>

      <h2 style={h2}>7. Your rights</h2>
      <p style={p}>
        You may ask us to access, correct or delete the personal data we hold about you. To make a
        request, contact us using the details below and we will respond within a reasonable time.
      </p>

      <h2 style={h2}>8. Contact</h2>
      <p style={p}>
        For any privacy question or request, message us on WhatsApp at +91 98231 41366 or visit any
        Virat Enterprises branch in Pune.
      </p>

      <hr style={{ border: 0, borderTop: "1px solid #E7E4DC", margin: "32px 0 16px" }} />
      <p className="mono" style={{ fontSize: 12.5, color: "#8A8578", margin: 0 }}>
        Last updated: July 2026 · Virat Enterprises, Pune · WhatsApp +91 98231 41366
      </p>
    </div>
  );
}
