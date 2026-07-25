"use client";

import { useEffect, useRef, useState } from "react";
import {
  INVESTMENT_TIERS,
  FRANCHISE_STEPS,
  INCLUSIONS,
  SERVICE_TAGS,
  FRANCHISE_ASSUMPTIONS,
} from "@/lib/data";
import { inr } from "@/lib/format";
import { buildLeadWhatsappUrl } from "@/lib/whatsapp";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const A = FRANCHISE_ASSUMPTIONS;

const KICKER: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: ".2em",
  color: "#9A968A",
};

const budgetChips = [
  { v: "10L", label: "₹10L" },
  { v: "20L", label: "₹20L" },
  { v: "30L", label: "₹30L" },
  { v: "unsure", label: "Not sure" },
];

const spaceChips = [
  { v: "yes", label: "Yes" },
  { v: "no", label: "Not yet" },
];

const FAQS = [
  {
    q: "How much investment do I need in total?",
    a: "From ₹10 lakh for the Starter tier, which includes the ₹2 lakh franchise fee. Growth (₹20 lakh) and Premium (₹30 lakh) add machinery capacity and a larger shop footprint.",
  },
  {
    q: "What is the FOFO model exactly?",
    a: "Franchise Owned, Franchise Operated — you invest and run the shop day to day. Virat provides the brand, shop design, machinery guidance, supply chain, training and ongoing support.",
  },
  {
    q: "Do I need to own the shop space?",
    a: "No. If you have a space we survey and approve it; if not, our team helps you shortlist locations in your area before the agreement.",
  },
  {
    q: "How long does the shop setup take?",
    a: "Fit-out is completed in X days once the agreement and location are finalised — exact timeline to be confirmed by the Virat team.",
  },
  {
    q: "Will I get online orders from this website?",
    a: "Yes. Orders placed on the Virat website from customers near your shop are routed to your branch dashboard automatically.",
  },
];

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el)
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - 70,
      behavior: "smooth",
    });
}

export default function FranchisePage() {
  // Selected investment tier (stores tier.total so ROI + cards share it).
  const [tier, setTier] = useState<number>(INVESTMENT_TIERS[0].total);

  // ROI sliders.
  const [sale, setSale] = useState<number>(A.defaultMonthlySale);
  const [gross, setGross] = useState<number>(A.grossMarginPct);
  const [net, setNet] = useState<number>(A.netMarginPct);

  // Lead form.
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("10L");
  const [hasSpace, setHasSpace] = useState("no");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [submitted, setSubmitted] = useState(false);

  const [faqOpen, setFaqOpen] = useState<number>(-1);

  const utmRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    params.forEach((val, key) => {
      if (key.toLowerCase().startsWith("utm_")) utm[key] = val;
    });
    utmRef.current = utm;
    // Ad-landing conversion signal (spec §7): franchise page view.
    if (typeof window.fbq === "function") {
      window.fbq("track", "ViewContent", { content_name: "franchise" });
    }
  }, []);

  // ---- ROI maths (mirrors prototype) ----
  const grossPerMonth = (sale * gross) / 100;
  const netPerMonth = (sale * net) / 100;
  const payback = netPerMonth > 0 ? Math.ceil(tier / netPerMonth) : 0;

  const g = A.yearGrowthPct / 100;
  const annual1 = netPerMonth * 12;
  const annual2 = annual1 * (1 + g);
  const annual3 = annual2 * (1 + g);
  const cumulative = [annual1, annual1 + annual2, annual1 + annual2 + annual3];
  const maxY = Math.max(cumulative[2], tier) * 1.1;

  const tierLabelSelected = "₹" + tier / 100000 + " lakh";

  function selectedBudgetLabel() {
    return budgetChips.find((c) => c.v === budget)?.label ?? budget;
  }

  async function submitLead() {
    const errs: { name?: string; phone?: string } = {};
    if (!name.trim()) errs.name = "Please enter your name.";
    const tenDigits = phone.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(tenDigits))
      errs.phone = "Enter a valid 10-digit Indian mobile number.";
    setErrors(errs);
    if (errs.name || errs.phone) return;

    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          city,
          budget: selectedBudgetLabel(),
          hasSpace: hasSpace === "yes" ? "Yes" : "Not yet",
          message,
          utm: utmRef.current,
        }),
      });
    } catch {
      // Best-effort — still show success so the customer can WhatsApp us.
    }

    setSubmitted(true);
    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      window.fbq("track", "Lead");
    }
  }

  // Chip styles.
  const roiChip = (active: boolean): React.CSSProperties =>
    active
      ? {
          padding: "9px 15px",
          borderRadius: 6,
          border: "1px solid #111",
          background: "#111",
          color: "#FFC400",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }
      : {
          padding: "9px 15px",
          borderRadius: 6,
          border: "1px solid #00000066",
          background: "transparent",
          color: "#111",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        };

  const smallChip = (active: boolean): React.CSSProperties =>
    active
      ? {
          padding: "7px 12px",
          borderRadius: 6,
          border: "1px solid #FFC400",
          background: "#FFC400",
          color: "#111",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }
      : {
          padding: "7px 12px",
          borderRadius: 6,
          border: "1px solid #3E3E36",
          background: "#1C1C18",
          color: "#F2F0E9",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        };

  const inputStyle: React.CSSProperties = {
    padding: "11px 13px",
    border: "1px solid #3E3E36",
    borderRadius: 6,
    background: "#1C1C18",
    color: "#F2F0E9",
    fontSize: 14,
  };

  return (
    <div>
      <style>{`
        @media (max-width: 720px) {
          .fr-hero-h1 { font-size: 40px !important; }
          .fr-stats { grid-template-columns: 1fr 1fr !important; }
          .fr-2col { grid-template-columns: minmax(0,1fr) !important; gap: 32px !important; }
          .fr-tiers { grid-template-columns: minmax(0,1fr) !important; }
          .fr-incl { grid-template-columns: 1fr 1fr !important; }
          .fr-roi-results { grid-template-columns: 1fr 1fr !important; }
          .fr-lead-inputs { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ============ 1. HERO ============ */}
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "88px 32px 64px" }}>
        <div style={KICKER}>FRANCHISE · FOFO MODEL · PUNE &amp; BEYOND</div>
        <h1
          className="fr-hero-h1"
          style={{
            margin: "20px 0 0",
            fontSize: 64,
            lineHeight: 1.04,
            fontWeight: 800,
            letterSpacing: "-.03em",
            maxWidth: 820,
            textWrap: "balance",
          }}
        >
          Own a Virat Enterprises franchise
          <span style={{ color: "#FFC400" }}>.</span>
        </h1>
        <p
          style={{
            margin: "24px 0 0",
            fontSize: 17,
            lineHeight: 1.6,
            color: "#C9C6BC",
            maxWidth: 560,
          }}
        >
          A proven neighbourhood print shop — with online orders from this website
          routed straight to your counter.
        </p>
        <div style={{ display: "flex", gap: 14, marginTop: 34, flexWrap: "wrap" }}>
          <button
            onClick={() => scrollTo("roi")}
            className="h-orange"
            style={{
              background: "#FFC400",
              color: "#111",
              border: 0,
              borderRadius: 6,
              padding: "16px 28px",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Calculate your ROI
          </button>
          <button
            onClick={() => scrollTo("lead")}
            className="h-outline"
            style={{
              background: "none",
              color: "#F2F0E9",
              border: "1px solid #57544B",
              borderRadius: 6,
              padding: "16px 24px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Submit interest
          </button>
        </div>
        <div
          className="fr-stats"
          style={{
            marginTop: 56,
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            borderTop: "1px solid #2E2E29",
          }}
        >
          {[
            { n: "6", l: "shops in Pune" },
            { n: inr(100000), l: "avg monthly sale per shop" },
            { n: inr(10000), l: "average daily sale" },
            { n: "₹10 lakh", l: "minimum investment" },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                padding: i === 0 ? "20px 32px 0 0" : "20px 32px 0",
                borderLeft: i === 0 ? undefined : "1px solid #2E2E29",
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em" }}>
                {s.n}
              </div>
              <div style={{ fontSize: 12.5, color: "#9A968A", marginTop: 3 }}>
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============ 2. ABOUT ============ */}
      <div style={{ borderTop: "1px solid #2E2E29", borderBottom: "1px solid #2E2E29", background: "#1C1C18" }}>
        <div
          className="fr-2col"
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "64px 32px",
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1.5fr)",
            gap: 64,
          }}
        >
          <div>
            <div style={KICKER}>ABOUT VIRAT</div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                marginTop: 12,
                letterSpacing: "-.02em",
              }}
            >
              Naam hi Kaafi hai
            </div>
          </div>
          <div>
            <p
              style={{
                fontSize: 15,
                color: "#C9C6BC",
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              Six shops across Pune offering printing, xerox, binding, lamination and
              stationery — serving students, offices and architects on quality, speed
              and price.
            </p>
            <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SERVICE_TAGS.map((t) => (
                <div
                  key={t}
                  style={{
                    border: "1px solid #3E3E36",
                    borderRadius: 6,
                    padding: "7px 11px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "#F2F0E9",
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 22,
                borderLeft: "2px solid #FFC400",
                paddingLeft: 16,
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 800 }}>
                Business model — FOFO
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  color: "#C9C6BC",
                  marginTop: 4,
                  lineHeight: 1.6,
                }}
              >
                FOFO — Franchise Owned, Franchise Operated. You own and run the shop;
                Virat provides the brand, systems, supply chain and online orders.
                (Owner to confirm exact model wording.)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ 3. INVESTMENT ============ */}
      <div style={{ borderTop: "1px solid #2E2E29" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "64px 32px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div>
              <div style={KICKER}>INVESTMENT</div>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  marginTop: 12,
                  letterSpacing: "-.02em",
                }}
              >
                Starts from ₹10 lakh
              </div>
            </div>
            <div style={{ fontSize: 13.5, color: "#9A968A" }}>
              Includes ₹2 lakh franchise fee.
            </div>
          </div>
          <div
            className="fr-tiers"
            style={{
              marginTop: 28,
              display: "grid",
              gridTemplateColumns: "repeat(3,minmax(0,1fr))",
              gap: 16,
            }}
          >
            {INVESTMENT_TIERS.map((t) => {
              const on = tier === t.total;
              return (
                <div
                  key={t.key}
                  style={{
                    background: "#1C1C18",
                    border: "1px solid " + (on ? "#FFC400" : "#2E2E29"),
                    boxShadow: on ? "0 0 0 1px #FFC400" : "none",
                    borderRadius: 8,
                    padding: 24,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <div style={KICKER}>{t.name}</div>
                    {t.tag ? (
                      <div
                        style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          letterSpacing: ".1em",
                          color: "#FFC400",
                        }}
                      >
                        {t.tag}
                      </div>
                    ) : null}
                  </div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      marginTop: 10,
                      letterSpacing: "-.02em",
                    }}
                  >
                    {t.totalLabel}
                  </div>
                  <div style={{ fontSize: 12.5, marginTop: 3, color: "#9A968A" }}>
                    Includes ₹2 lakh franchise fee
                  </div>
                  <div
                    style={{
                      marginTop: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      borderTop: "1px solid #26261F",
                      paddingTop: 14,
                      minHeight: 118,
                    }}
                  >
                    {t.bullets.map((p, i) => (
                      <div
                        key={i}
                        style={{ fontSize: 13, lineHeight: 1.5, color: "#C9C6BC" }}
                      >
                        {p}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setTier(t.total);
                      scrollTo("roi");
                    }}
                    className={on ? "h-blue" : "h-white"}
                    style={{
                      marginTop: 16,
                      width: "100%",
                      border: on ? 0 : "1px solid #57544B",
                      borderRadius: 6,
                      padding: 11,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      background: on ? "#FFC400" : "#1C1C18",
                      color: on ? "#111" : "#F2F0E9",
                    }}
                  >
                    {on ? "Selected in calculator ✓" : "Use in ROI calculator"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============ 4. INCLUSIONS ============ */}
      <div style={{ borderTop: "1px solid #2E2E29", background: "#1C1C18" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "64px 32px" }}>
          <div style={KICKER}>WHAT&apos;S INCLUDED</div>
          <div
            className="fr-incl"
            style={{
              marginTop: 24,
              display: "grid",
              gridTemplateColumns: "repeat(4,minmax(0,1fr))",
              gap: "36px 40px",
            }}
          >
            {INCLUSIONS.map((i) => (
              <div key={i} style={{ borderTop: "1px solid #2E2E29", paddingTop: 14 }}>
                <div
                  style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.01em" }}
                >
                  {i}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "#9A968A",
                    marginTop: 6,
                    lineHeight: 1.55,
                  }}
                >
                  Provided by Virat
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 13,
              color: "#E8B25C",
              borderLeft: "2px solid #FFC400",
              paddingLeft: 14,
              lineHeight: 1.6,
            }}
          >
            Shop fit-out timeline (X days) and the sample shop-layout design gallery
            are pending from the owner.
          </div>
        </div>
      </div>

      {/* ============ 5. STEPS ============ */}
      <div style={{ borderTop: "1px solid #2E2E29" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "64px 32px" }}>
          <div style={KICKER}>HOW TO GET A FRANCHISE</div>
          <div
            style={{
              marginTop: 28,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
              gap: 0,
              borderTop: "1px solid #2E2E29",
            }}
          >
            {FRANCHISE_STEPS.map((s, i) => (
              <div
                key={s.n}
                style={{
                  padding: "20px 20px 0 0",
                  borderRight:
                    i === FRANCHISE_STEPS.length - 1
                      ? undefined
                      : "1px solid #2E2E29",
                  marginRight: i === FRANCHISE_STEPS.length - 1 ? 0 : 20,
                }}
              >
                <div
                  className="mono"
                  style={{ fontSize: 13, fontWeight: 800, color: "#FFC400" }}
                >
                  {s.n}
                </div>
                <div
                  style={{
                    fontSize: 14.5,
                    fontWeight: 700,
                    marginTop: 8,
                    letterSpacing: "-.01em",
                  }}
                >
                  {s.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#C9C6BC",
                    marginTop: 5,
                    lineHeight: 1.5,
                  }}
                >
                  {s.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============ 6. ROI CALCULATOR ============ */}
      <div id="roi" style={{ background: "#FFC400", color: "#111" }}>
        <div
          className="fr-2col"
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "72px 32px",
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
            gap: 72,
            alignItems: "start",
          }}
        >
          {/* LEFT: controls */}
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: ".2em",
                color: "#111",
              }}
            >
              ROI CALCULATOR
            </div>
            <div
              style={{
                fontSize: 38,
                fontWeight: 800,
                marginTop: 14,
                letterSpacing: "-.025em",
                lineHeight: 1.1,
              }}
            >
              What can your shop earn?
            </div>

            <div
              style={{
                marginTop: 36,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".16em",
                color: "#111",
              }}
            >
              INVESTMENT TIER
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {INVESTMENT_TIERS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTier(t.total)}
                  style={roiChip(tier === t.total)}
                >
                  {t.totalLabel}
                </button>
              ))}
            </div>

            {/* Monthly sale */}
            <div
              style={{
                marginTop: 28,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: ".16em",
                  color: "#111",
                }}
              >
                EXPECTED MONTHLY SALE
              </div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 800 }}>
                {inr(sale)}
              </div>
            </div>
            <input
              type="range"
              min={A.minMonthlySale}
              max={A.maxMonthlySale}
              step={A.stepMonthlySale}
              value={sale}
              onChange={(e) => setSale(parseInt(e.target.value, 10))}
              style={{ width: "100%", marginTop: 12, accentColor: "#111" }}
            />

            {/* Gross margin */}
            <div
              style={{
                marginTop: 24,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: ".16em",
                  color: "#111",
                }}
              >
                GROSS MARGIN
              </div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 800 }}>
                {gross}%
              </div>
            </div>
            <input
              type="range"
              min={15}
              max={60}
              step={1}
              value={gross}
              onChange={(e) => setGross(parseInt(e.target.value, 10))}
              style={{ width: "100%", marginTop: 12, accentColor: "#111" }}
            />

            {/* Net margin */}
            <div
              style={{
                marginTop: 24,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: ".16em",
                  color: "#111",
                }}
              >
                NET MARGIN (after rent, staff, power)
              </div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 800 }}>
                {net}%
              </div>
            </div>
            <input
              type="range"
              min={5}
              max={45}
              step={1}
              value={net}
              onChange={(e) => setNet(parseInt(e.target.value, 10))}
              style={{ width: "100%", marginTop: 12, accentColor: "#111" }}
            />

            <div
              style={{
                marginTop: 20,
                fontSize: 11.5,
                color: "#4A3E00",
                lineHeight: 1.6,
              }}
            >
              Estimates based on current shop performance; actual results vary. Not a
              guarantee of returns.
            </div>
          </div>

          {/* RIGHT: results */}
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 0,
                border: "1px solid #00000042",
                borderRadius: 8,
                overflow: "hidden",
              }}
              className="fr-roi-results"
            >
              <div
                style={{ padding: "20px 22px", borderRight: "1px solid #00000042" }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "#111",
                    fontWeight: 700,
                    letterSpacing: ".1em",
                  }}
                >
                  GROSS PROFIT / MO
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    marginTop: 6,
                    letterSpacing: "-.02em",
                  }}
                >
                  {inr(grossPerMonth)}
                </div>
              </div>
              <div style={{ padding: "20px 22px" }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "#111",
                    fontWeight: 700,
                    letterSpacing: ".1em",
                  }}
                >
                  NET PROFIT / MO
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    marginTop: 6,
                    letterSpacing: "-.02em",
                  }}
                >
                  {inr(netPerMonth)}
                </div>
              </div>
              <div
                style={{
                  padding: "20px 22px",
                  borderTop: "1px solid #00000042",
                  gridColumn: "span 2",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#111",
                      fontWeight: 700,
                      letterSpacing: ".1em",
                    }}
                  >
                    PAYBACK
                  </div>
                  <div
                    style={{
                      fontSize: 34,
                      fontWeight: 800,
                      marginTop: 4,
                      letterSpacing: "-.02em",
                      color: "#111",
                    }}
                  >
                    {payback} mo
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: "#111" }}>
                  on {tierLabelSelected}
                </div>
              </div>
            </div>

            {/* Bar chart */}
            <div
              style={{
                marginTop: 32,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".16em",
                color: "#111",
              }}
            >
              3-YEAR CUMULATIVE NET PROFIT VS INVESTMENT
            </div>
            <div
              style={{
                marginTop: 18,
                display: "flex",
                alignItems: "flex-end",
                gap: 20,
                height: 180,
                borderBottom: "1px solid #00000042",
                position: "relative",
              }}
            >
              {/* investment level dashed line */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: Math.round((tier / maxY) * 100) + "%",
                  borderTop: "1px dashed #111",
                  zIndex: 0,
                }}
              >
                <div
                  className="mono"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: -16,
                    fontSize: 10.5,
                    color: "#111",
                  }}
                >
                  Investment {tierLabelSelected}
                </div>
              </div>
              {cumulative.map((cum, i) => {
                const reached = cum >= tier;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      height: "100%",
                      textAlign: "center",
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    <div
                      style={{
                        height:
                          Math.max(4, Math.round((cum / maxY) * 100)) + "%",
                        background: reached ? "#111" : "#00000040",
                        borderTop:
                          "2px solid " + (reached ? "#111" : "#00000066"),
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
              {cumulative.map((cum, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 11.5, color: "#111" }}>
                    Y{i + 1}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 12.5, fontWeight: 700, marginTop: 3 }}
                  >
                    {inr(cum)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============ 7. LEAD FORM ============ */}
      <div id="lead" style={{ background: "#1C1C18", borderTop: "1px solid #2E2E29" }}>
        <div
          className="fr-2col"
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "64px 32px",
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)",
            gap: 64,
          }}
        >
          <div>
            <div style={KICKER}>TALK TO US</div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 800,
                marginTop: 12,
                letterSpacing: "-.02em",
              }}
            >
              Submit your interest
            </div>
            <div
              style={{
                fontSize: 14,
                color: "#C9C6BC",
                marginTop: 12,
                lineHeight: 1.65,
                maxWidth: 340,
              }}
            >
              Tell us about you — we&apos;ll call back. The franchise team gets in
              touch within 24 hours.
            </div>
          </div>

          <div>
            {submitted ? (
              <div style={{ borderLeft: "2px solid #6FCF8E", paddingLeft: 18 }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: "#6FCF8E" }}>
                  Thanks — we&apos;ll call you shortly.
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    color: "#C9C6BC",
                    marginTop: 8,
                    lineHeight: 1.6,
                  }}
                >
                  Your enquiry is with the franchise team.
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    marginTop: 16,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <a
                    href={buildLeadWhatsappUrl(
                      name,
                      phone,
                      selectedBudgetLabel()
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="h-blue"
                    style={{
                      background: "#6FCF8E",
                      color: "#111",
                      fontSize: 13.5,
                      fontWeight: 700,
                      padding: "11px 16px",
                      borderRadius: 6,
                    }}
                  >
                    Message us on WhatsApp now
                  </a>
                </div>
              </div>
            ) : (
              <div>
                <div
                  className="fr-lead-inputs"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={inputStyle}
                    />
                    {errors.name ? (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 13,
                          color: "#F08A8A",
                          fontWeight: 600,
                        }}
                      >
                        {errors.name}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <input
                      type="tel"
                      placeholder="Mobile number (10 digits)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={inputStyle}
                    />
                    {errors.phone ? (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 13,
                          color: "#F08A8A",
                          fontWeight: 600,
                        }}
                      >
                        {errors.phone}
                      </div>
                    ) : null}
                  </div>
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    placeholder="City / area for the shop"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div
                  style={{
                    marginTop: 18,
                    display: "flex",
                    gap: 48,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: ".16em",
                        color: "#9A968A",
                      }}
                    >
                      INVESTMENT BUDGET
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      {budgetChips.map((c) => (
                        <button
                          key={c.v}
                          onClick={() => setBudget(c.v)}
                          style={smallChip(budget === c.v)}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: ".16em",
                        color: "#9A968A",
                      }}
                    >
                      OWN A SHOP SPACE?
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                      {spaceChips.map((c) => (
                        <button
                          key={c.v}
                          onClick={() => setHasSpace(c.v)}
                          style={smallChip(hasSpace === c.v)}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <textarea
                  rows={3}
                  placeholder="Anything you'd like to tell us"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  style={{
                    marginTop: 16,
                    width: "100%",
                    padding: "11px 13px",
                    border: "1px solid #3E3E36",
                    borderRadius: 6,
                    background: "#1C1C18",
                    color: "#F2F0E9",
                    resize: "vertical",
                    fontSize: 14,
                  }}
                />

                <button
                  onClick={submitLead}
                  className="h-orange"
                  style={{
                    marginTop: 16,
                    background: "#FFC400",
                    color: "#111",
                    border: 0,
                    borderRadius: 6,
                    padding: "15px 26px",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Request a call back
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============ 8. FAQ ============ */}
      <div style={{ borderTop: "1px solid #2E2E29" }}>
        <div
          className="fr-2col"
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "64px 32px",
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)",
            gap: 64,
          }}
        >
          <div>
            <div style={KICKER}>FAQ</div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 800,
                marginTop: 12,
                letterSpacing: "-.02em",
              }}
            >
              Questions
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {FAQS.map((f, i) => {
              const open = faqOpen === i;
              return (
                <div key={i} style={{ borderBottom: "1px solid #2E2E29" }}>
                  <button
                    onClick={() => setFaqOpen(open ? -1 : i)}
                    style={{
                      width: "100%",
                      background: "none",
                      border: 0,
                      padding: "18px 0",
                      textAlign: "left",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        lineHeight: 1.4,
                        letterSpacing: "-.01em",
                      }}
                    >
                      {f.q}
                    </span>
                    <span
                      className="faq-icon"
                      style={{
                        fontSize: 20,
                        color: "#FFC400",
                        fontWeight: 600,
                        transform: open ? "rotate(45deg)" : "none",
                        flex: "none",
                        lineHeight: 1,
                      }}
                    >
                      +
                    </span>
                  </button>
                  {open ? (
                    <div
                      style={{
                        padding: "0 40px 20px 0",
                        fontSize: 13.5,
                        color: "#C9C6BC",
                        lineHeight: 1.7,
                      }}
                    >
                      {f.a}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div style={{ borderTop: "1px solid #2E2E29" }}>
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "48px 32px 88px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 20,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-.02em",
              maxWidth: 640,
            }}
          >
            Ready to own a Virat Enterprises shop in your area?
          </div>
          <button
            onClick={() => scrollTo("lead")}
            className="h-orange"
            style={{
              background: "#FFC400",
              color: "#111",
              border: 0,
              borderRadius: 6,
              padding: "16px 28px",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Submit interest
          </button>
        </div>
      </div>
    </div>
  );
}
