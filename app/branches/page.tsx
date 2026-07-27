import type { Metadata } from "next";
import { BRANCHES, SPECIALTY_RATES } from "@/lib/data";
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
          color: "#9A968A",
        }}
      >
        Our Shops
      </div>
      <h1
        style={{
          fontSize: 40,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "#F2F0E9",
          margin: "12px 0 8px",
          lineHeight: 1.05,
        }}
      >
        Six shops across Pune
      </h1>
      <p style={{ fontSize: 16, color: "#C9C6BC", maxWidth: 620, margin: "0 0 28px", lineHeight: 1.6 }}>
        Walk in for xerox, printing, binding and lamination — or order online and pick the branch
        nearest you. Open every day, 9:30 AM to 9:30 PM.
      </p>

      {/* Flat map placeholder — Leaflet + OpenStreetMap in production */}
      <div
        style={{
          position: "relative",
          height: 300,
          border: "1px solid #2E2E29",
          background: "#23231E",
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
              "linear-gradient(to right, #ffffff12 1px, transparent 1px), linear-gradient(to bottom, #ffffff12 1px, transparent 1px)",
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
              background: "#FFC400",
              color: "#111",
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
            color: "#9A968A",
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
          background: "#2E2E29",
          border: "1px solid #2E2E29",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {BRANCHES.map((b, i) => {
          const tel = b.phone.replace(/[^\d+]/g, "");
          return (
            <div key={b.id} style={{ background: "#1C1C18", padding: 22 }}>
              {b.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.photoUrl}
                  alt={b.name}
                  style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 6, marginBottom: 14 }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "16/9",
                    background: "#23231E",
                    border: "1px dashed #3E3E36",
                    borderRadius: 6,
                    marginBottom: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    color: "#6E6B62",
                  }}
                >
                  Shop photo coming soon
                </div>
              )}
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span
                  className="mono"
                  style={{ fontSize: 12, color: "#6E6B62", fontWeight: 600, minWidth: 16 }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#F2F0E9" }}>{b.name}</span>
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#FFC400",
                  margin: "8px 0 10px",
                }}
              >
                {b.brand}
              </div>
              <p
                style={{
                  fontSize: 14,
                  color: "#C9C6BC",
                  lineHeight: 1.55,
                  margin: 0,
                  minHeight: 66,
                }}
              >
                {b.address}
              </p>
              {!b.confirmed && (
                <div style={{ fontSize: 12, color: "#6E6B62", marginTop: 6 }}>
                  address pending confirmation
                </div>
              )}
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                <a
                  href={`tel:${tel}`}
                  className="mono"
                  style={{ fontSize: 13.5, color: "#FFC400", fontWeight: 600, textDecoration: "none" }}
                >
                  {b.phone}
                </a>
                <div style={{ fontSize: 13, color: "#9A968A" }}>{b.hours}</div>
              </div>
              {(b.mapsUrl != null || (b.lat != null && b.lng != null)) && (
                <a
                  href={b.mapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-ink"
                  style={{
                    display: "inline-block",
                    marginTop: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#FFC400",
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

      <p style={{ fontSize: 12.5, color: "#6E6B62", marginTop: 18, lineHeight: 1.6 }}>
        *Addresses &amp; map pins for 5 branches pending owner confirmation. Branch data lives in an
        admin-editable table.
      </p>

      {/* Full specialty rate list from the owner's counter card */}
      <div style={{ marginTop: 64 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".2em", color: "#9A968A" }}>
            SPECIALTY RATE LIST
          </div>
          <div style={{ fontSize: 13, color: "#9A968A" }}>Same rates at every branch</div>
        </div>
        <div
          className="ve-rates-grid"
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(2,minmax(0,1fr))",
            gap: "0 48px",
            borderTop: "1px solid #2E2E29",
          }}
        >
          {SPECIALTY_RATES.map((r) => (
            <div
              key={r.key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: "13px 0",
                borderBottom: "1px solid #26261F",
                fontSize: 14,
              }}
            >
              <div style={{ color: "#C9C6BC" }}>{r.label}</div>
              <div style={{ fontWeight: 700, color: "#F2F0E9", whiteSpace: "nowrap" }}>{r.display}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12.5, color: "#6E6B62", marginTop: 14, lineHeight: 1.6 }}>
          Jumbo prints: A2 ₹30 / A1 ₹40 / A0 ₹60 (B/W) · A2 ₹60 / A1 ₹80 / A0 ₹120 (colour) — order them
          online from the print wizard. Binding: spiral ₹40 · blackbook ₹150 · rexine (premium) ₹350.
        </p>
      </div>

      <style>{`@media(max-width:720px){
        .branches-grid{grid-template-columns:1fr !important;}
        .ve-rates-grid{grid-template-columns:1fr !important;}
      }`}</style>
    </div>
  );
}
