"use client";

// Admin settings — /admin/settings (spec §9). Manages WHO receives new-order
// details and WHO can log in to the staff dashboard:
//   1. Per-branch notification contacts (email for automatic order emails,
//      WhatsApp number that customer order messages open to, branch phone).
//   2. Staff login allowlist (emails that get dashboard access + their role).
// Persists to Supabase when configured (ADMIN_PASSCODE-guarded); in demo mode
// the page is fully usable but says changes aren't stored server-side yet.

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGate from "@/components/AdminGate";

interface BranchSetting {
  id: string;
  name: string;
  notifyEmail: string;
  notifyWhatsapp: string;
  phone: string;
}

interface StaffEmail {
  email: string;
  role: "staff" | "admin";
  branchIds: string[];
}

const KICKER: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: ".16em",
  color: "#9A968A",
};

const INPUT: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #3E3E36",
  borderRadius: 6,
  background: "#1C1C18",
  color: "#F2F0E9",
  fontSize: 13.5,
};

function AdminSettingsInner() {
  const [live, setLive] = useState(false);
  const [branches, setBranches] = useState<BranchSetting[]>([]);
  const [staff, setStaff] = useState<StaffEmail[]>([]);
  const [passcode, setPasscode] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "demo" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok) {
          setLive(!!j.live);
          setBranches(j.branches ?? []);
          setStaff(j.staff ?? []);
        }
      })
      .catch(() => {});
  }, []);

  const setBranch = (id: string, patch: Partial<BranchSetting>) =>
    setBranches((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const setStaffRow = (i: number, patch: Partial<StaffEmail>) =>
    setStaff((ss) => ss.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const addStaff = () => setStaff((ss) => [...ss, { email: "", role: "staff", branchIds: [] }]);
  const removeStaff = (i: number) => setStaff((ss) => ss.filter((_, j) => j !== i));

  async function save() {
    setSaveState("saving");
    setSaveError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branches, staff, passcode }),
      });
      const j = await res.json();
      if (!j.ok) {
        setSaveState("error");
        setSaveError(j.error === "wrong_passcode" ? "Wrong passcode." : String(j.error ?? "Save failed"));
        return;
      }
      setSaveState(j.persisted ? "saved" : "demo");
      setTimeout(() => setSaveState("idle"), 3000);
    } catch {
      setSaveState("error");
      setSaveError("Network error — try again.");
    }
  }

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "40px 20px 96px" }}>
      {/* header */}
      <div style={{ borderBottom: "1px solid #2E2E29", paddingBottom: 22 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".2em", color: "#9A968A" }}>
          ADMIN · SETTINGS
        </div>
        <h1 style={{ margin: "10px 0 0", fontSize: 34, fontWeight: 800, letterSpacing: "-.025em", color: "#F2F0E9" }}>
          Staff &amp; notifications
        </h1>
        <div style={{ fontSize: 13, color: "#9A968A", marginTop: 5 }}>
          Who receives new-order details, and who can work the dashboard.{" "}
          <Link href="/admin" style={{ color: "#FFC400" }}>
            ← Back to orders
          </Link>
        </div>
      </div>

      {!live && (
        <div style={{ marginTop: 20, borderLeft: "2px solid #E8B25C", paddingLeft: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#E8B25C" }}>Demo mode</div>
          <div style={{ fontSize: 12.5, color: "#C9C6BC", marginTop: 4, lineHeight: 1.55, maxWidth: 560 }}>
            The database isn&rsquo;t connected yet, so changes here don&rsquo;t stick server-side. Everything
            becomes editable-and-saved the moment Supabase is configured. Until then, order details reach
            the shop on WhatsApp.
          </div>
        </div>
      )}

      {/* how it flows */}
      <div style={{ marginTop: 28, borderLeft: "2px solid #FFC400", paddingLeft: 14, maxWidth: 640 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#F2F0E9" }}>How order details reach the branch</div>
        <div style={{ fontSize: 12.5, color: "#C9C6BC", marginTop: 4, lineHeight: 1.6 }}>
          <b style={{ color: "#F2F0E9" }}>WhatsApp:</b> the customer&rsquo;s confirmation screen opens a
          pre-filled message (full job details) to the branch&rsquo;s WhatsApp number below — the customer
          sends it and attaches the files. <b style={{ color: "#F2F0E9" }}>Email:</b> once the email key is
          set, every order is also emailed automatically to the branch&rsquo;s notification address + admins.{" "}
          <b style={{ color: "#F2F0E9" }}>Dashboard:</b> staff on the allowlist below sign in and see their
          branch&rsquo;s live queue, download files, verify payments and update statuses.
        </div>
      </div>

      {/* branch notifications */}
      <div style={{ marginTop: 40 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".2em", color: "#9A968A" }}>
          BRANCH NOTIFICATIONS
        </div>
        <div className="ve-set-grid" style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 }}>
          {branches.map((b) => (
            <div key={b.id} style={{ border: "1px solid #2E2E29", borderRadius: 8, background: "#1C1C18", padding: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#F2F0E9" }}>{b.name}</div>
              <div style={{ marginTop: 14 }}>
                <div style={KICKER}>ORDER EMAILS GO TO</div>
                <input
                  type="email"
                  placeholder="branch email — e.g. mukund@virat.co.in"
                  value={b.notifyEmail}
                  onChange={(e) => setBranch(b.id, { notifyEmail: e.target.value })}
                  style={{ ...INPUT, marginTop: 8 }}
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={KICKER}>CUSTOMER WHATSAPP ORDERS GO TO</div>
                <input
                  type="tel"
                  placeholder="WhatsApp number — e.g. 919823141366"
                  value={b.notifyWhatsapp}
                  onChange={(e) => setBranch(b.id, { notifyWhatsapp: e.target.value })}
                  style={{ ...INPUT, marginTop: 8 }}
                  className="mono"
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={KICKER}>BRANCH PHONE (SHOWN ON SITE)</div>
                <input
                  type="tel"
                  placeholder="+91 …"
                  value={b.phone}
                  onChange={(e) => setBranch(b.id, { phone: e.target.value })}
                  style={{ ...INPUT, marginTop: 8 }}
                  className="mono"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* staff allowlist */}
      <div style={{ marginTop: 40 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".2em", color: "#9A968A" }}>
            STAFF LOGINS (DASHBOARD ACCESS)
          </div>
          <div style={{ fontSize: 12.5, color: "#6E6B62" }}>
            Staff sign in with these emails — role decides what they can see.
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {staff.length === 0 && (
            <div style={{ fontSize: 13, color: "#6E6B62" }}>No staff added yet.</div>
          )}
          {staff.map((s, i) => (
            <div
              key={i}
              className="ve-staff-row"
              style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 150px minmax(0,1fr) 70px", gap: 10, alignItems: "center" }}
            >
              <input
                type="email"
                placeholder="email@example.com"
                value={s.email}
                onChange={(e) => setStaffRow(i, { email: e.target.value })}
                style={INPUT}
              />
              <select
                value={s.role}
                onChange={(e) => setStaffRow(i, { role: e.target.value === "admin" ? "admin" : "staff" })}
                style={{ ...INPUT, cursor: "pointer" }}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin (all branches + reports)</option>
              </select>
              <select
                value={s.branchIds[0] ?? ""}
                onChange={(e) => setStaffRow(i, { branchIds: e.target.value ? [e.target.value] : [] })}
                style={{ ...INPUT, cursor: "pointer" }}
              >
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => removeStaff(i)}
                className="h-remove"
                style={{ background: "none", border: 0, color: "#6E6B62", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addStaff}
          style={{ marginTop: 14, background: "none", border: "1px solid #57544B", color: "#F2F0E9", borderRadius: 6, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          className="h-outline"
        >
          + Add staff email
        </button>
      </div>

      {/* save */}
      <div style={{ marginTop: 40, borderTop: "1px solid #2E2E29", paddingTop: 22, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        {live && (
          <input
            type="password"
            placeholder="Admin passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            style={{ ...INPUT, width: 180 }}
            className="mono"
          />
        )}
        <button
          onClick={save}
          disabled={saveState === "saving"}
          className="h-orange"
          style={{ background: "#FFC400", color: "#111", border: 0, borderRadius: 6, padding: "13px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          {saveState === "saving" ? "Saving…" : "Save settings"}
        </button>
        {saveState === "saved" && <div style={{ fontSize: 13, fontWeight: 700, color: "#6FCF8E" }}>Saved ✓</div>}
        {saveState === "demo" && (
          <div style={{ fontSize: 13, color: "#E8B25C" }}>
            Noted — will persist once the database is connected.
          </div>
        )}
        {saveState === "error" && <div style={{ fontSize: 13, fontWeight: 700, color: "#F08A8A" }}>{saveError}</div>}
      </div>

      <style>{`
        @media (max-width: 860px) {
          .ve-set-grid { grid-template-columns: 1fr !important; }
          .ve-staff-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default function Page() {
  return (
    <AdminGate>
      <AdminSettingsInner />
    </AdminGate>
  );
}
