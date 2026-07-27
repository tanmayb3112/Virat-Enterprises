import Link from "next/link";
import { BRANCHES, SERVICES, RATE_CARD } from "@/lib/data";
import { config } from "@/lib/config";
import { inr } from "@/lib/format";

export default function HomePage() {
  const freeMin = inr(config.freeDeliveryMinOrder);
  const radius = `${config.freeDeliveryRadiusKm} km`;

  return (
    <div style={{ minHeight: "100vh", background: "#121210" }}>
      {/* HERO */}
      <div
        className="ve-hero"
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "72px 20px 64px",
          display: "grid",
          gridTemplateColumns: "minmax(0,1.35fr) minmax(300px,420px)",
          gap: 72,
          alignItems: "start",
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".2em", color: "#9A968A" }}>
            PRINTING &amp; XEROX · 6 SHOPS ACROSS PUNE
          </div>
          <h1
            className="ve-h1"
            style={{ margin: "20px 0 0", fontSize: 72, lineHeight: 1.02, fontWeight: 800, letterSpacing: "-.035em", color: "#F2F0E9" }}
          >
            Upload. Print.
            <br />
            Delivered<span style={{ color: "#FFC400" }}>.</span>
          </h1>
          <p style={{ margin: "26px 0 0", fontSize: 17, lineHeight: 1.6, color: "#C9C6BC", maxWidth: 520 }}>
            Send files from any device, choose how they&rsquo;re printed, and collect at the nearest Virat shop — or
            have them brought to your door.
          </p>
          <div style={{ display: "flex", gap: 14, marginTop: 36, alignItems: "center", flexWrap: "wrap" }}>
            <Link
              href="/order"
              className="h-orange"
              style={{ background: "#FFC400", color: "#111", borderRadius: 6, padding: "16px 28px", fontSize: 15, fontWeight: 700 }}
            >
              Order prints now
            </Link>
            <Link
              href="/branches"
              className="h-outline"
              style={{ color: "#F2F0E9", border: "1px solid #57544B", borderRadius: 6, padding: "16px 24px", fontSize: 15, fontWeight: 600 }}
            >
              Find a branch
            </Link>
          </div>
          <div style={{ marginTop: 56, display: "flex", gap: 0, borderTop: "1px solid #2E2E29", flexWrap: "wrap" }}>
            <Stat value="6" label="shops in Pune" first />
            <Stat valueNode={<>₹2<span style={{ fontSize: 15, fontWeight: 600, color: "#9A968A" }}> /side</span></>} label="A4 B/W · double side ₹2 per sheet" />
            <Stat value={radius} label={`free delivery over ${freeMin}`} />
          </div>
        </div>

        {/* RATE CARD */}
        <div style={{ border: "1px solid #2E2E29", borderRadius: 8, background: "#1C1C18" }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid #2E2E29", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em" }}>RATE CARD</div>
            <div style={{ fontSize: 11.5, color: "#9A968A" }}>per side</div>
          </div>
          <div style={{ padding: "6px 22px 8px" }}>
            {RATE_CARD.map((r, i) => (
              <div
                key={r.key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: i === RATE_CARD.length - 1 ? "none" : "1px solid #26261F",
                  fontSize: 14,
                }}
              >
                <div>{r.label}</div>
                <div style={{ fontWeight: 700 }}>{r.display}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "14px 22px", borderTop: "1px solid #2E2E29", fontSize: 12, color: "#9A968A", lineHeight: 1.5 }}>
            Live price shown as you set options. Minimum order ₹20.
          </div>
        </div>
      </div>

      {/* DELIVERY STRIP */}
      <div style={{ borderTop: "1px solid #2E2E29", borderBottom: "1px solid #2E2E29", background: "#1C1C18" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "14px 20px", display: "flex", gap: 10, alignItems: "baseline", fontSize: 13, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 800, color: "#FFC400", letterSpacing: ".06em" }}>FREE DELIVERY</span>
          <span style={{ color: "#C9C6BC" }}>
            within {radius} of your branch on orders above {freeMin} — otherwise sent as a COD courier, paid to the
            delivery partner at actuals.
          </span>
        </div>
      </div>

      {/* SERVICES */}
      <Section kicker="SERVICES" note="Prices from the admin-editable rate card">
        <div
          className="ve-services"
          style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: "1px solid #2E2E29", borderLeft: "1px solid #2E2E29" }}
        >
          {SERVICES.map((s) => (
            <div
              key={s.name}
              className="h-cell"
              style={{ borderRight: "1px solid #2E2E29", borderBottom: "1px solid #2E2E29", padding: "24px 22px", background: "#121210" }}
            >
              <div style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: "-.01em" }}>{s.name}</div>
              <div style={{ fontSize: 13, color: "#9A968A", marginTop: 6 }}>{s.price}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* HOW IT WORKS */}
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "72px 20px 0" }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".2em", color: "#9A968A" }}>HOW IT WORKS</div>
        <div
          className="ve-how"
          style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 48, borderTop: "1px solid #2E2E29", paddingTop: 28 }}
        >
          <How n="01" title="Upload your files" body="PDF, Word, PowerPoint, photos. Page counts are read in the browser; multiple files go in one order." />
          <How n="02" title="Choose how to print" body="B/W or colour, single or double side, binding, lamination. The price updates as you decide." />
          <How n="03" title="Pay by UPI, we print" body="Track the job by link — no login needed. Pick up at the counter or get it delivered." />
        </div>
      </div>

      {/* OUR SHOPS */}
      <div id="branches" style={{ maxWidth: 1240, margin: "0 auto", padding: "72px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".2em", color: "#9A968A" }}>OUR SHOPS</div>
          <Link href="/branches" style={{ fontSize: 13, color: "#9A968A" }}>
            View all &amp; directions →
          </Link>
        </div>
        <div
          className="ve-shops"
          style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 1, background: "#2E2E29", border: "1px solid #2E2E29" }}
        >
          {BRANCHES.map((b) => (
            <div key={b.id} style={{ background: "#1C1C18", padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.01em" }}>{b.name}</div>
                <a
                  className="mono"
                  href={`https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 12, color: "#FFC400", fontWeight: 700 }}
                >
                  Map →
                </a>
              </div>
              <div style={{ fontSize: 11.5, color: "#FFC400", fontWeight: 700, letterSpacing: ".06em", marginTop: 3 }}>
                {b.brand.toUpperCase()}
              </div>
              <div style={{ fontSize: 13, color: "#C9C6BC", marginTop: 10, lineHeight: 1.55, minHeight: 60 }}>{b.address}</div>
              <div style={{ fontSize: 13, color: "#FFC400", fontWeight: 600, marginTop: 8 }}>{b.phone}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: "#6E6B62" }}>
          *Addresses &amp; map pins for 5 branches pending owner confirmation. Branch data lives in an admin-editable table.
        </div>
      </div>

      {/* FRANCHISE BAND */}
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "72px 20px 88px" }}>
        <div
          className="ve-franchise-band"
          style={{ background: "#FFC400", padding: "52px 56px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 40, flexWrap: "wrap" }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".2em", color: "#111" }}>FRANCHISE · FOFO MODEL</div>
            <div style={{ fontSize: 34, fontWeight: 800, color: "#111", marginTop: 12, letterSpacing: "-.02em", lineHeight: 1.15, maxWidth: 560 }}>
              Own a Virat shop in your area — from ₹10 lakh.
            </div>
            <div style={{ fontSize: 14.5, color: "#4A3E00", marginTop: 10 }}>
              Includes the ₹2 lakh franchise fee. Online orders routed to your counter.
            </div>
          </div>
          <Link
            href="/franchise"
            className="h-white"
            style={{ background: "#111", color: "#FFC400", borderRadius: 6, padding: "16px 26px", fontSize: 15, fontWeight: 700, flex: "none" }}
          >
            Calculate your ROI →
          </Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .ve-hero { grid-template-columns: 1fr !important; gap: 40px !important; }
          .ve-services { grid-template-columns: repeat(2,1fr) !important; }
          .ve-shops { grid-template-columns: 1fr !important; }
          .ve-how { grid-template-columns: 1fr !important; gap: 28px !important; }
        }
        @media (max-width: 560px) {
          .ve-h1 { font-size: 46px !important; }
          .ve-franchise-band { padding: 32px 24px !important; }
        }
      `}</style>
    </div>
  );
}

function Stat({
  value,
  valueNode,
  label,
  first,
}: {
  value?: string;
  valueNode?: React.ReactNode;
  label: string;
  first?: boolean;
}) {
  return (
    <div
      style={{
        padding: first ? "20px 40px 0 0" : "20px 40px 0",
        borderLeft: first ? "none" : "1px solid #2E2E29",
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em" }}>{valueNode ?? value}</div>
      <div style={{ fontSize: 12.5, color: "#9A968A", marginTop: 3 }}>{label}</div>
    </div>
  );
}

function Section({ kicker, note, children }: { kicker: string; note: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "72px 20px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".2em", color: "#9A968A" }}>{kicker}</div>
        <div style={{ fontSize: 13, color: "#9A968A" }}>{note}</div>
      </div>
      {children}
    </div>
  );
}

function How({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 13, fontWeight: 800, color: "#FFC400" }}>{n}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 10, letterSpacing: "-.01em" }}>{title}</div>
      <div style={{ fontSize: 14, color: "#C9C6BC", marginTop: 8, lineHeight: 1.6 }}>{body}</div>
    </div>
  );
}
