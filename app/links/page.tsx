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
          fontSize: 15,
          fontWeight: 800,
          letterSpacing: "0.16em",
          color: "#1A1A1A",
        }}
      >
        VIRAT ENTERPRISES
      </div>
      <div style={{ fontSize: 15, color: "#8A8578", marginTop: 8 }}>Naam hi Kaafi hai</div>
      <div className="mono" style={{ fontSize: 12.5, color: "#B0AB9F", marginTop: 10 }}>
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
            border: "1px solid #E7E4DC",
            background: l.primary ? "#F5821F" : "#fff",
            color: l.primary ? "#fff" : "#1A1A1A",
            ...(l.primary ? { borderColor: "#F5821F" } : {}),
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

      <div className="mono" style={{ fontSize: 12.5, color: "#8A8578", marginTop: 40 }}>
        WhatsApp +91 98231 41366
      </div>
    </div>
  );
}
