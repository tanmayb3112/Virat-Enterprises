import type { Metadata } from "next";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Links",
  description:
    "Virat Enterprises — order prints, explore the franchise & ROI, find our 6 Pune shops or message us on WhatsApp. Naam hi Kaafi hai.",
};

const LINKS: { label: string; href: string; external?: boolean; primary?: boolean }[] = [
  { label: "Order prints →", href: "/order", primary: true },
  { label: "Franchise & ROI →", href: "/franchise" },
  { label: "Our 6 shops →", href: "/branches" },
  {
    label: "WhatsApp us →",
    href: `https://wa.me/${config.whatsappNumber}`,
    external: true,
  },
];

export default function LinksPage() {
  return (
    <div
      className="links-page"
      style={{
        maxWidth: 460,
        margin: "0 auto",
        padding: "56px 20px 96px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-baloo), var(--font-jakarta), sans-serif",
          fontSize: 30,
          fontWeight: 800,
          color: "#FFD200",
          WebkitTextStroke: "0.6px #D8342A",
        }}
      >
        विराट एंटरप्राइजेस
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: "0.16em",
          color: "#F2F0E9",
          marginTop: 6,
        }}
      >
        VIRAT ENTERPRISES
      </div>
      <div style={{ fontFamily: "var(--font-baloo), var(--font-jakarta), sans-serif", fontSize: 15, fontWeight: 700, color: "#FF5A47", marginTop: 6 }}>
        नाम ही काफी है !
      </div>
      <div className="mono" style={{ fontSize: 12.5, color: "#6E6B62", marginTop: 10 }}>
        Printing &amp; Xerox · 6 shops in Pune
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginTop: 32,
        }}
      >
        {LINKS.map((l) => {
          const style: React.CSSProperties = {
            display: "block",
            padding: "16px 20px",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 15.5,
            textAlign: "center",
            textDecoration: "none",
            border: "1px solid #2E2E29",
            background: l.primary ? "#FFC400" : "#1C1C18",
            color: l.primary ? "#111" : "#F2F0E9",
            ...(l.primary ? { borderColor: "#FFC400" } : {}),
          };
          const props = l.external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {};
          return (
            <a
              key={l.label}
              href={l.href}
              className={l.primary ? "h-orange" : "h-cell"}
              style={style}
              {...props}
            >
              {l.label}
            </a>
          );
        })}
      </div>

      <div className="mono" style={{ fontSize: 12.5, color: "#6E6B62", marginTop: 40 }}>
        WhatsApp +91 98231 41366
      </div>
    </div>
  );
}
