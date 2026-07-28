"use client";

// AdminGate — wraps the /admin pages. Live mode: only admin/staff get through,
// everyone else is asked to log in. Demo mode (no Supabase): the pages behind
// this have no data to show, so the interstitial says so rather than promising
// a sample dashboard.

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

const KICKER: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: ".2em",
  color: "#9A968A",
};

const WRAP: React.CSSProperties = {
  maxWidth: 460,
  margin: "0 auto",
  padding: "80px 20px 120px",
  textAlign: "center",
};

const BTN: React.CSSProperties = {
  display: "inline-block",
  background: "#FFC400",
  color: "#111",
  border: "none",
  borderRadius: 6,
  padding: "12px 24px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

export default function AdminGate({ children }: { children: React.ReactNode }) {
  const { loading, live, role } = useAuth();
  const [previewOk, setPreviewOk] = useState(false);

  if (loading) {
    return (
      <div style={{ padding: 80, textAlign: "center", color: "#9A968A", fontSize: 14 }}>
        Checking access…
      </div>
    );
  }

  if (live) {
    if (role === "admin" || role === "staff") return <>{children}</>;
    return (
      <div style={WRAP}>
        <div style={KICKER}>STAFF AREA</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: "#F2F0E9", margin: "12px 0 12px" }}>
          Login required
        </h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "#C9C6BC", margin: "0 0 24px" }}>
          This area is for Virat staff. Sign in with your staff email.
        </p>
        <Link href="/login" className="h-orange" style={BTN}>
          Login
        </Link>
      </div>
    );
  }

  // Demo mode — one-time interstitial, then show the sample dashboard.
  if (!previewOk) {
    return (
      <div style={WRAP}>
        <div style={KICKER}>STAFF AREA</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: "#F2F0E9", margin: "12px 0 12px" }}>
          Staff area
        </h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "#C9C6BC", margin: "0 0 24px" }}>
          The dashboard reads live orders from the database. Connect Supabase to activate
          it — until then there is nothing to show here.
        </p>
        <button type="button" onClick={() => setPreviewOk(true)} className="h-orange" style={BTN}>
          Continue anyway
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
