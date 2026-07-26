import Link from "next/link";
import { config } from "@/lib/config";

export default function Footer() {
  return (
    <div style={{ background: "#000", color: "#8F8B82" }}>
      <div
        className="ve-footer-grid"
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "52px 20px",
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: 40,
        }}
      >
        <div>
          <div style={{ color: "#F2F0E9", fontWeight: 800, letterSpacing: ".16em", fontSize: 13 }}>
            VIRAT ENTERPRISES
          </div>
          <div style={{ fontSize: 13, marginTop: 10, lineHeight: 1.6, maxWidth: 280 }}>
            Printing, xerox, binding, lamination and stationery. Six shops across Pune. Naam hi Kaafi hai.
          </div>
        </div>
        <FooterCol title="ORDER">
          <FooterLink href="/order">Order prints</FooterLink>
          <FooterLink href="/branches">Branches</FooterLink>
          <FooterLink href="/links">Links</FooterLink>
          <a href={`https://wa.me/${config.whatsappNumber}`} target="_blank" rel="noreferrer" style={{ color: "#B9B6AC" }}>
            WhatsApp
          </a>
        </FooterCol>
        <FooterCol title="BUSINESS">
          <FooterLink href="/franchise">Franchise</FooterLink>
          <FooterLink href="/admin">Staff login</FooterLink>
          <FooterLink href="/admin/reports">Reports</FooterLink>
          <FooterLink href="/admin/settings">Settings</FooterLink>
        </FooterCol>
        <FooterCol title="LEGAL">
          <FooterLink href="/legal/terms">Terms</FooterLink>
          <FooterLink href="/legal/privacy">Privacy</FooterLink>
          <FooterLink href="/legal/refunds">Refunds</FooterLink>
        </FooterCol>
      </div>
      <style>{`
        @media (max-width: 720px) {
          .ve-footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
      <div style={{ color: "#F2F0E9", fontWeight: 700, fontSize: 12, letterSpacing: ".12em" }}>{title}</div>
      {children}
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{ color: "#B9B6AC" }}>
      {children}
    </Link>
  );
}
