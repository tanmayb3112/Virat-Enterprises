"use client";

// Login — /login. Supabase email OTP (6-digit code). In demo mode (no
// Supabase configured) the form is replaced with an explanatory note.

import { useState, CSSProperties, FormEvent } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth";

const KICKER: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: ".2em",
  color: "#9A968A",
};

const INPUT: CSSProperties = {
  width: "100%",
  background: "#1C1C18",
  border: "1px solid #3E3E36",
  borderRadius: 6,
  padding: "11px 13px",
  color: "#F2F0E9",
  fontSize: 15,
  outline: "none",
};

const LABEL: CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#9A968A",
  marginBottom: 6,
};

const PRIMARY: CSSProperties = {
  width: "100%",
  background: "#FFC400",
  color: "#111",
  border: "none",
  borderRadius: 6,
  padding: "12px 18px",
  fontSize: 14.5,
  fontWeight: 700,
  cursor: "pointer",
};

export default function LoginPage() {
  const { live } = useAuth();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Supabase's Email OTP Length is configurable (6–10 digits), so never assume
  // 6 — the send-code route reports the real length. null = not yet known
  // (Supabase's own mailer sent it), in which case accept anything in range.
  const [digits, setDigits] = useState<number | null>(null);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setError("");
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    const addr = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(addr)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);

    // Preferred path: we mint and email the code ourselves (Resend), so a
    // misconfigured Supabase SMTP setup cannot block logins. The route answers
    // { fallback: true } when it is not fully configured.
    // Set when the route got far enough to prove Supabase's auth database and
    // code generation are healthy — which pins any failure below on the mailer.
    let authDbOk = false;
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addr }),
      });
      const out = await res.json().catch(() => null);
      if (out?.ok) {
        setBusy(false);
        setEmail(addr);
        setCode("");
        setDigits(typeof out.digits === "number" ? out.digits : null);
        setStep("code");
        return;
      }
      if (out && !out.fallback) {
        setBusy(false);
        setError(out.error || "Could not send the login code. Please try again.");
        return;
      }
      authDbOk = !!out?.authDbOk;
    } catch {
      // Route unreachable — try Supabase's own mailer below.
    }

    const { error: err } = await supabase.auth.signInWithOtp({
      email: addr,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (err) {
      console.error("signInWithOtp failed:", err);
      const raw = (err.message ?? "").trim();
      const useful = raw && raw !== "{}" && raw !== "[object Object]" ? raw : "";
      setError(
        useful ||
          (authDbOk
            ? `Could not send the login email (code ${err.status ?? "unknown"}). The database side is fine — this is Supabase's mailer. Set RESEND_API_KEY in Vercel so the site sends codes itself, or fix Authentication → SMTP.`
            : `Could not send the login email (code ${err.status ?? "unknown"}). Supabase's mailer rejected it — either fix Authentication → SMTP (see the Auth logs for the reason), or set RESEND_API_KEY in Vercel so the site sends login codes itself.`)
      );
      return;
    }
    setEmail(addr);
    setCode("");
    setDigits(null); // Supabase sent it; its configured length is unknown here
    setStep("code");
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setError("");
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    const token = code.trim();
    if (token.length < (digits ?? 6)) {
      setError(`Enter the ${digits ?? 6}-digit code from the email.`);
      return;
    }
    setBusy(true);
    const { data, error: err } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (err || !data.session) {
      setBusy(false);
      setError(err?.message || "That code didn't work. Check it and try again.");
      return;
    }
    // Route by role: staff/admin → dashboard, everyone else → account.
    let dest = "/account";
    try {
      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      const me = await res.json();
      if (me.role === "admin" || me.role === "staff") dest = "/admin";
    } catch {
      // fall through to /account
    }
    window.location.href = dest;
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "56px 20px 96px" }}>
      <div style={KICKER}>SIGN IN</div>
      <h1 style={{ fontSize: 34, fontWeight: 800, color: "#F2F0E9", margin: "10px 0 24px" }}>
        Login
      </h1>

      {!live ? (
        <>
          <div
            style={{
              borderLeft: "3px solid #E8B25C",
              background: "#1C1C18",
              padding: "14px 16px",
              fontSize: 14,
              lineHeight: 1.6,
              color: "#C9C6BC",
              borderRadius: "0 6px 6px 0",
            }}
          >
            Login activates once the shop&rsquo;s database is connected — the site owner is
            setting this up.
          </div>
          <div style={{ marginTop: 20 }}>
            <Link href="/" style={{ fontSize: 13.5, fontWeight: 600, color: "#FFC400" }}>
              ← Back to home
            </Link>
          </div>
        </>
      ) : step === "email" ? (
        <form onSubmit={sendCode}>
          <label style={LABEL} htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={INPUT}
            disabled={busy}
          />
          {error && (
            <div style={{ marginTop: 10, fontSize: 13, color: "#F08A8A" }}>{error}</div>
          )}
          <button type="submit" className="h-orange" style={{ ...PRIMARY, marginTop: 16 }} disabled={busy}>
            {busy ? "Sending…" : "Send login code"}
          </button>
          <p style={{ marginTop: 18, fontSize: 12.5, lineHeight: 1.6, color: "#6E6B62" }}>
            Staff &amp; admin: use the email your admin added in Settings. Customers: any
            email works — your details and addresses get saved to your account.
          </p>
        </form>
      ) : (
        <form onSubmit={verifyCode}>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#C9C6BC", margin: "0 0 16px" }}>
            We emailed a {digits ? `${digits}-digit ` : ""}code to{" "}
            <span style={{ color: "#F2F0E9", fontWeight: 600 }}>{email}</span>
          </p>
          <label style={LABEL} htmlFor="login-code">
            Code
          </label>
          <input
            id="login-code"
            className="mono"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={digits ?? 10}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder={"0".repeat(digits ?? 6)}
            style={{ ...INPUT, letterSpacing: ".3em", fontSize: 18 }}
            disabled={busy}
          />
          {error && (
            <div style={{ marginTop: 10, fontSize: 13, color: "#F08A8A" }}>{error}</div>
          )}
          <button type="submit" className="h-orange" style={{ ...PRIMARY, marginTop: 16 }} disabled={busy}>
            {busy ? "Verifying…" : "Verify & sign in"}
          </button>
          <div style={{ marginTop: 18 }}>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setError("");
                setCode("");
              }}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontSize: 13.5,
                fontWeight: 600,
                color: "#9A968A",
              }}
            >
              ← Back
            </button>
          </div>
          <p style={{ marginTop: 18, fontSize: 12.5, lineHeight: 1.6, color: "#6E6B62" }}>
            Staff &amp; admin: use the email your admin added in Settings. Customers: any
            email works — your details and addresses get saved to your account.
          </p>
        </form>
      )}
    </div>
  );
}
