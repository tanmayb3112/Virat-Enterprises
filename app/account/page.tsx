"use client";

// Customer account — /account. Profile (name + phone) and saved addresses,
// backed by the Supabase `profiles` and `addresses` tables. Demo mode and
// signed-out states render friendly prompts instead.

import { useEffect, useState, CSSProperties, FormEvent } from "react";
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
  fontSize: 14.5,
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
  background: "#FFC400",
  color: "#111",
  border: "none",
  borderRadius: 6,
  padding: "11px 22px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const SECTION_KICKER: CSSProperties = { ...KICKER, marginBottom: 14 };

interface Address {
  id: string | number;
  label: string;
  line1: string;
  city: string;
  pincode: string;
}

export default function AccountPage() {
  const { loading, live, user, signOut } = useAuth();

  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addrError, setAddrError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newLine1, setNewLine1] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newPincode, setNewPincode] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase || !user) return;
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const id = u?.user?.id;
      if (!id || cancelled) return;
      setUserId(id);
      const [{ data: profile }, { data: addrs }] = await Promise.all([
        supabase.from("profiles").select("name,phone").eq("id", id).maybeSingle(),
        supabase.from("addresses").select("*").eq("profile_id", id),
      ]);
      if (cancelled) return;
      if (profile) {
        setName(profile.name ?? "");
        setPhone(profile.phone ?? "");
      }
      if (addrs) setAddresses(addrs as Address[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseBrowser();
    if (!supabase || !userId) return;
    setSaving(true);
    setSaved(false);
    setProfileError("");
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, name: name.trim(), phone: phone.trim() });
    setSaving(false);
    if (error) {
      setProfileError(error.message || "Could not save. Try again.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function addAddress(e: FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseBrowser();
    if (!supabase || !userId) return;
    setAddrError("");
    if (!newLine1.trim() || !newCity.trim()) {
      setAddrError("Address line and area/city are required.");
      return;
    }
    setAddBusy(true);
    const row = {
      profile_id: userId,
      label: newLabel.trim() || "Home",
      line1: newLine1.trim(),
      city: newCity.trim(),
      pincode: newPincode.trim(),
    };
    const { data, error } = await supabase.from("addresses").insert(row).select().maybeSingle();
    setAddBusy(false);
    if (error) {
      setAddrError(error.message || "Could not add the address. Try again.");
      return;
    }
    if (data) setAddresses((a) => [...a, data as Address]);
    setNewLabel("");
    setNewLine1("");
    setNewCity("");
    setNewPincode("");
    setShowAdd(false);
  }

  async function removeAddress(id: Address["id"]) {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setAddrError("");
    const { error } = await supabase.from("addresses").delete().eq("id", id);
    if (error) {
      setAddrError(error.message || "Could not remove the address.");
      return;
    }
    setAddresses((a) => a.filter((x) => x.id !== id));
  }

  async function handleSignOut() {
    await signOut();
    window.location.href = "/";
  }

  const shell: CSSProperties = { maxWidth: 560, margin: "0 auto", padding: "56px 20px 96px" };

  if (!live) {
    return (
      <div style={{ ...shell, maxWidth: 420 }}>
        <div style={KICKER}>ACCOUNT</div>
        <h1 style={{ fontSize: 34, fontWeight: 800, color: "#F2F0E9", margin: "10px 0 24px" }}>
          Your account
        </h1>
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
          Accounts activate once the shop&rsquo;s database is connected.
        </div>
        <div style={{ marginTop: 20 }}>
          <Link href="/" style={{ fontSize: 13.5, fontWeight: 600, color: "#FFC400" }}>
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 80, textAlign: "center", color: "#9A968A", fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ ...shell, maxWidth: 420, textAlign: "center" }}>
        <div style={KICKER}>ACCOUNT</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: "#F2F0E9", margin: "12px 0 12px" }}>
          Sign in to see your account
        </h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "#C9C6BC", margin: "0 0 24px" }}>
          Your name, number and saved addresses live here.
        </p>
        <Link
          href="/login"
          className="h-orange"
          style={{ ...PRIMARY, display: "inline-block", padding: "12px 24px" }}
        >
          Login
        </Link>
      </div>
    );
  }

  return (
    <div style={shell}>
      <div style={KICKER}>ACCOUNT</div>
      <h1 style={{ fontSize: 34, fontWeight: 800, color: "#F2F0E9", margin: "10px 0 6px" }}>
        Your account
      </h1>
      <div className="mono" style={{ fontSize: 13, color: "#9A968A" }}>{user.email}</div>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#6E6B62", margin: "12px 0 0" }}>
        Your name &amp; number pre-fill at checkout. Saved addresses come up when you
        choose delivery.
      </p>

      {/* PROFILE */}
      <div style={{ marginTop: 40, paddingTop: 28, borderTop: "1px solid #2E2E29" }}>
        <div style={SECTION_KICKER}>PROFILE</div>
        <form onSubmit={saveProfile}>
          <div style={{ marginBottom: 14 }}>
            <label style={LABEL} htmlFor="acc-name">
              Name
            </label>
            <input
              id="acc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              style={INPUT}
              autoComplete="name"
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={LABEL} htmlFor="acc-phone">
              Phone
            </label>
            <input
              id="acc-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile"
              style={INPUT}
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
          {profileError && (
            <div style={{ marginBottom: 12, fontSize: 13, color: "#F08A8A" }}>{profileError}</div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button type="submit" className="h-orange" style={PRIMARY} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            {saved && <span style={{ fontSize: 13.5, fontWeight: 600, color: "#6FCF8E" }}>Saved ✓</span>}
          </div>
        </form>
      </div>

      {/* ADDRESSES */}
      <div style={{ marginTop: 40, paddingTop: 28, borderTop: "1px solid #2E2E29" }}>
        <div style={SECTION_KICKER}>ADDRESSES</div>

        {addresses.length === 0 && !showAdd && (
          <p style={{ fontSize: 14, color: "#6E6B62", margin: "0 0 14px" }}>
            No saved addresses yet.
          </p>
        )}

        {addresses.map((a) => (
          <div
            key={a.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "13px 0",
              borderBottom: "1px solid #26261F",
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#F2F0E9" }}>{a.label}</div>
              <div style={{ fontSize: 13.5, color: "#C9C6BC", marginTop: 3, lineHeight: 1.5 }}>
                {a.line1}
                {a.city ? `, ${a.city}` : ""}
                {a.pincode ? ` — ${a.pincode}` : ""}
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeAddress(a.id)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                color: "#F08A8A",
                flex: "none",
              }}
            >
              Remove
            </button>
          </div>
        ))}

        {addrError && (
          <div style={{ marginTop: 12, fontSize: 13, color: "#F08A8A" }}>{addrError}</div>
        )}

        {showAdd ? (
          <form onSubmit={addAddress} style={{ marginTop: 18 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={LABEL} htmlFor="addr-label">
                Label
              </label>
              <input
                id="addr-label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Home / Office"
                style={INPUT}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={LABEL} htmlFor="addr-line1">
                Address line
              </label>
              <input
                id="addr-line1"
                value={newLine1}
                onChange={(e) => setNewLine1(e.target.value)}
                placeholder="Flat / building / street"
                style={INPUT}
              />
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 180px" }}>
                <label style={LABEL} htmlFor="addr-city">
                  Area / city
                </label>
                <input
                  id="addr-city"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="Kothrud, Pune"
                  style={INPUT}
                />
              </div>
              <div style={{ flex: "1 1 120px" }}>
                <label style={LABEL} htmlFor="addr-pincode">
                  Pincode
                </label>
                <input
                  id="addr-pincode"
                  value={newPincode}
                  onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="411038"
                  style={INPUT}
                  inputMode="numeric"
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button type="submit" className="h-orange" style={PRIMARY} disabled={addBusy}>
                {addBusy ? "Adding…" : "Add address"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false);
                  setAddrError("");
                }}
                className="h-outline"
                style={{
                  background: "none",
                  border: "1px solid #57544B",
                  color: "#F2F0E9",
                  borderRadius: 6,
                  padding: "11px 22px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            style={{
              marginTop: 14,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontSize: 13.5,
              fontWeight: 700,
              color: "#FFC400",
            }}
          >
            + Add address
          </button>
        )}
      </div>

      {/* SIGN OUT */}
      <div style={{ marginTop: 40, paddingTop: 28, borderTop: "1px solid #2E2E29" }}>
        <button
          type="button"
          onClick={handleSignOut}
          className="h-outline"
          style={{
            background: "none",
            border: "1px solid #57544B",
            color: "#F2F0E9",
            borderRadius: 6,
            padding: "11px 22px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
