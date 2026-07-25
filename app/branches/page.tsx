import type { Metadata } from "next";
import { BRANCHES } from "@/lib/data";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Our 6 Shops in Pune",
  description:
    "Find a Virat Enterprises print shop near you — six branches across Pune with addresses, hours, phone numbers and directions. Xerox, printing, binding and lamination.",
};

// Approximate pin positions on the flat map placeholder (percentage-based so
// they scale). Real map is Leaflet + OpenStreetMap in production.
const PIN_POS = [
  { left: "24%", top: "44%" },
  { left: "58%", top: "26%" },
  { left: "40%", top: "70%" },
  { left: "50%", top: "40%" },
  { left: "70%", top: "58%" },
  { left: "33%", top: "60%" },
];

export default function BranchesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": BRANCHES.map((b) => ({
      "@type": "LocalBusiness",
      name: `Virat Enterprises — ${b.name}`,
      image: `${config.siteUrl}/og.png`,
      address: {
        "@type": "PostalAddress",
        streetAddress: b.address,
        addressLocality: "Pune",
        addressRegion: "Maharashtra",
        addressCountry: "IN",
      },
      telephone: "+91 98231 41366",
      ...(b.lat != null && b.lng != null
        ? { geo: { "@type": "GeoCoordinates", latitude: b.lat, longitude: b.lng } }
        : {}),
      openingHours: "Mo-Su 09:30-21:30",
      url: `${config.siteUrl}/branches`,
      priceRange: "₹",
    })),
  };

  return (
    <div
      className="branches-page"
      style={{ maxWidth: 1240, margin: "0 auto", padding: "48px 20px 96px" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
        Our Shops
      </div>
      <h1
        style={{
          fontSize: 40,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "#1A1A1A",
          margin: "12px 0 8px",
          lineHeight: 1.05,
        }}
      >
        Six shops across Pune
      </h1>
      <p style={{ fontSize: 16, color: "#55524A", maxWidth: 620, margin: "0 0 28px", lineHeight: 1.6 }}>
        Walk in for xerox, printing, binding and lamination — or order online and pick the branch
        nearest you. Open every day, 9:30 AM to 9:30 PM.
      </p>

      {/* Flat map placeholder — Leaflet + OpenStreetMap in production */}
      <div
        style={{
          position: "relative",
          height: 300,
          border: "1px solid #E7E4DC",
          background: "#EDEBE3",
          borderRadius: 8,
          overflow: "hidden",
          marginBottom: 28,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to right, rgba(27,58,107,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(27,58,107,0.06) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {BRANCHES.map((b, i) => (
          <div
            key={b.id}
            title={b.name}
            className="mono"
            style={{
              position: "absolute",
              left: PIN_POS[i]?.left ?? "50%",
              top: PIN_POS[i]?.top ?? "50%",
              transform: "translate(-50%, -50%)",
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "#1B3A6B",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
            }}
          >
            {i + 1}
          </div>
        ))}
        <div
          className="mono"
          style={{
            position: "absolute",
            left: 12,
            bottom: 10,
            fontSize: 11,
            color: "#8A8578",
          }}
        >
          Leaflet + OpenStreetMap in production
        </div>
      </div>

      {/* Branch grid */}
      <div
        className="branches-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 1,
          background: "#E7E4DC",
          border: "1px solid #E7E4DC",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {BRANCHES.map((b, i) => {
          const tel = b.phone.replace(/[^\d+]/g, "");
          return (
            <div key={b.id} style={{ background: "#fff", padding: 22 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span
                  className="mono"
                  style={{ fontSize: 12, color: "#B0AB9F", fontWeight: 600, minWidth: 16 }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A" }}>{b.name}</span>
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#F5821F",
                  margin: "8px 0 10px",
                }}
              >
                {b.brand}
              </div>
              <p
                style={{
                  fontSize: 14,
                  color: "#55524A",
                  lineHeight: 1.55,
                  margin: 0,
                  minHeight: 66,
                }}
              >
                {b.address}
              </p>
              {!b.confirmed && (
                <div style={{ fontSize: 12, color: "#B0AB9F", marginTop: 6 }}>
                  address pending confirmation
                </div>
              )}
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                <a
                  href={`tel:${tel}`}
                  className="mono"
                  style={{ fontSize: 13.5, color: "#1B3A6B", fontWeight: 600, textDecoration: "none" }}
                >
                  {b.phone}
                </a>
                <div style={{ fontSize: 13, color: "#8A8578" }}>{b.hours}</div>
              </div>
              {b.lat != null && b.lng != null && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-ink"
                  style={{
                    display: "inline-block",
                    marginTop: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#1B3A6B",
                    textDecoration: "none",
                  }}
                >
                  Directions ↗
                </a>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 12.5, color: "#B0AB9F", marginTop: 18, lineHeight: 1.6 }}>
        *Addresses &amp; map pins for 5 branches pending owner confirmation. Branch data lives in an
        admin-editable table.
      </p>

      <style>{`@media(max-width:720px){
        .branches-grid{grid-template-columns:1fr !important;}
      }`}</style>
    </div>
  );
}
