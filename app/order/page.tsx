"use client";

import { useState, useRef, useEffect } from "react";
import {
  defaultPrefs,
  computeOrder,
  computeFileCost,
  isFreeDelivery,
} from "@/lib/pricing";
import type {
  OrderFile,
  FilePrefs,
  PaperSize,
  ColorMode,
  Sides,
  Orientation,
  Gsm,
  Nup,
  Binding,
  Lamination,
} from "@/lib/pricing";
import { BRANCHES } from "@/lib/data";
import { config } from "@/lib/config";
import { inr } from "@/lib/format";
import { buildOrderWhatsappUrl, branchCode } from "@/lib/whatsapp";
import type { OrderPayload } from "@/lib/whatsapp";

/* ------------------------------------------------------------------ */
/* shared style atoms                                                  */
/* ------------------------------------------------------------------ */

const kicker: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: ".16em",
  color: "#9A968A",
};
const kickerLg: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: ".2em",
  color: "#9A968A",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  border: "1px solid #3E3E36",
  borderRadius: 6,
  background: "#1C1C18",
};
const mono = "mono";

const STEP_ITEMS = [
  { n: "01", label: "Files" },
  { n: "02", label: "Options" },
  { n: "03", label: "Preview" },
  { n: "04", label: "Branch" },
  { n: "05", label: "Pay" },
];
const STEP_TITLES: Record<number, string> = {
  1: "Upload your files",
  2: "Print options",
  3: "Preview",
  4: "Choose a branch",
  5: "Delivery & payment",
};

const DEMO_KM = [1.2, 2.4, 3.8, 5.1, 6.5, 8.0];
const demoKm = (i: number) => DEMO_KM[i] ?? 1.2 + i * 1.3;
const MAP_PINS = [
  { l: "22%", t: "30%" },
  { l: "55%", t: "22%" },
  { l: "70%", t: "55%" },
  { l: "38%", t: "62%" },
  { l: "82%", t: "38%" },
  { l: "15%", t: "68%" },
];

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function chipStyle(selected: boolean): React.CSSProperties {
  return {
    borderRadius: 6,
    padding: "9px 14px",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    ...(selected
      ? { background: "#FFC400", color: "#111", border: "1px solid #FFC400" }
      : { background: "#1C1C18", color: "#F2F0E9", border: "1px solid #3E3E36" }),
  };
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={chipStyle(selected)}>
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

export default function OrderPage() {
  const [files, setFiles] = useState<OrderFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [step, setStep] = useState<number>(1);
  const [binding, setBinding] = useState<Binding>("none");
  const [lamination, setLamination] = useState<Lamination>("none");
  const [branchId, setBranchId] = useState<string>(BRANCHES[0].id);
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">(
    "delivery"
  );
  const [addr, setAddr] = useState({ line1: "", area: "", pin: "" });
  const [distance, setDistance] = useState<number>(DEMO_KM[0]);
  const [utr, setUtr] = useState("");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [placed, setPlaced] = useState(false);
  const [orderNo, setOrderNo] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const utmRef = useRef<Record<string, string>>({});

  // Capture UTM params on mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u: Record<string, string> = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(
      (k) => {
        const v = params.get(k);
        if (v) u[k] = v;
      }
    );
    utmRef.current = u;
  }, []);

  // Keep activeId valid as files change.
  useEffect(() => {
    if (files.length && !files.some((f) => f.id === activeId)) {
      setActiveId(files[0].id);
    } else if (!files.length && activeId) {
      setActiveId(null);
    }
  }, [files, activeId]);

  const order = computeOrder(files, binding, lamination, config.gstEnabled);
  const selectedBranch = BRANCHES.find((b) => b.id === branchId) ?? BRANCHES[0];
  const branchName = selectedBranch.name;
  const free = isFreeDelivery(
    distance,
    order.total,
    config.freeDeliveryRadiusKm,
    config.freeDeliveryMinOrder
  );
  const activeFile = files.find((f) => f.id === activeId) ?? files[0] ?? null;

  const validPhone = /^[6-9]\d{9}$/.test(custPhone.replace(/\D/g, "").slice(-10));
  const step1Valid = files.length > 0 && files.every((f) => f.pages > 0);
  const step5Valid =
    config.paymentMode === "manual"
      ? utr.trim().length >= 6 && !!custName && validPhone
      : !!custName && validPhone;
  const canContinue = step === 1 ? step1Valid : step === 5 ? step5Valid : true;

  // Fire Meta Pixel on confirmation mount.
  useEffect(() => {
    if (placed && typeof window !== "undefined") {
      const w = window as unknown as { fbq?: (...a: unknown[]) => void };
      if (typeof w.fbq === "function") {
        w.fbq("track", "Purchase", { value: order.total, currency: "INR" });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed]);

  /* -------------------------- file handling -------------------------- */

  async function onFiles(list: FileList) {
    const arr = Array.from(list);
    const added: OrderFile[] = [];
    for (const file of arr) {
      const ext = (file.name.split(".").pop() || "").toUpperCase();
      const lower = ext.toLowerCase();
      let kind: OrderFile["kind"];
      let pages = 0;
      if (lower === "pdf") {
        kind = "pdf";
        try {
          const buf = await file.arrayBuffer();
          const text = new TextDecoder("latin1").decode(new Uint8Array(buf));
          const m = text.match(/\/Type\s*\/Page[^s]/g);
          pages = m ? m.length : 0;
        } catch {
          pages = 0;
        }
      } else if (lower === "jpg" || lower === "jpeg" || lower === "png") {
        kind = "image";
        pages = 1;
      } else {
        kind = "office";
        pages = 0;
      }
      added.push({ id: uid(), name: file.name, ext, kind, pages, prefs: defaultPrefs() });
    }
    setFiles((prev) => {
      const next = [...prev, ...added];
      if (!activeId && next.length) setActiveId(next[0].id);
      return next;
    });
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }
  function setFilePages(id: string, val: number) {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, pages: Number.isFinite(val) && val > 0 ? Math.floor(val) : 0 }
          : f
      )
    );
  }
  function patchPrefs(patch: Partial<FilePrefs>) {
    if (!activeFile) return;
    setFiles((prev) =>
      prev.map((f) =>
        f.id === activeFile.id ? { ...f, prefs: { ...f.prefs, ...patch } } : f
      )
    );
  }

  function handleNext() {
    if (!canContinue) return;
    if (step < 5) setStep(step + 1);
    else placeOrder();
  }

  async function placeOrder() {
    const items = files.map((f) => ({
      file_name: f.name,
      page_count: f.pages,
      prefs: f.prefs,
      line_total: computeFileCost(f).lineTotal,
    }));
    const body = {
      branchId,
      branchName,
      items,
      binding,
      lamination,
      deliveryType,
      address: deliveryType === "delivery" ? addr : null,
      distanceKm: distance,
      freeDelivery: free,
      subtotal: order.subtotal,
      total: order.total,
      utr,
      custName,
      custPhone,
      utm: utmRef.current,
    };
    let no = "";
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { orderNo?: string };
      no = data.orderNo ?? "";
      if (!no) throw new Error("no orderNo");
    } catch {
      const now = new Date();
      const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const rand4 = String(Math.floor(1000 + Math.random() * 9000));
      no = `VE-${branchCode(branchName)}-${ym}-${rand4}`;
    }
    setOrderNo(no);
    setPlaced(true);
  }

  function resetOrder() {
    setFiles([]);
    setActiveId(null);
    setStep(1);
    setBinding("none");
    setLamination("none");
    setBranchId(BRANCHES[0].id);
    setDeliveryType("delivery");
    setAddr({ line1: "", area: "", pin: "" });
    setDistance(DEMO_KM[0]);
    setUtr("");
    setCustName("");
    setCustPhone("");
    setMoreOpen(false);
    setOrderNo("");
    setPlaced(false);
  }

  /* ------------------------------ render ----------------------------- */

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "48px 32px 96px" }}>
      <style>{`
        @media (max-width: 720px) {
          .order-body { grid-template-columns: 1fr !important; gap: 32px !important; }
          .order-summary { position: static !important; }
          .step-title { font-size: 28px !important; }
          .grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {!placed ? (
        <>
          {/* header row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 24,
              flexWrap: "wrap",
              borderBottom: "1px solid #2E2E29",
              paddingBottom: 24,
            }}
          >
            <div>
              <div style={{ ...kickerLg }}>NEW ORDER</div>
              <h1
                className="step-title"
                style={{
                  margin: "10px 0 0",
                  fontSize: 38,
                  fontWeight: 800,
                  letterSpacing: "-.025em",
                }}
              >
                {STEP_TITLES[step]}
              </h1>
            </div>
            <div style={{ display: "flex", gap: 28, alignItems: "baseline", flexWrap: "wrap" }}>
              {STEP_ITEMS.map((si, i) => {
                const n = i + 1;
                const current = n === step;
                const done = n < step;
                const numColor = current ? "#FFC400" : done ? "#F2F0E9" : "#57544B";
                const labColor = current || done ? "#F2F0E9" : "#57544B";
                return (
                  <div key={si.n} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    <div className={mono} style={{ fontSize: 12, fontWeight: 600, color: numColor }}>
                      {si.n}
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: labColor }}>{si.label}</div>
                  </div>
                );
              })}
              <button
                onClick={resetOrder}
                style={{
                  background: "none",
                  border: 0,
                  color: "#6E6B62",
                  fontSize: 12,
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                Start over
              </button>
            </div>
          </div>

          {/* body grid */}
          <div
            className="order-body"
            style={{
              marginTop: 36,
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) 340px",
              gap: 56,
              alignItems: "start",
            }}
          >
            <div style={{ minWidth: 0 }}>
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
              {step === 4 && renderStep4()}
              {step === 5 && renderStep5()}
            </div>

            {renderSummary()}
          </div>
        </>
      ) : (
        renderConfirmation()
      )}
    </div>
  );

  /* ============================= STEP 1 ============================= */
  function renderStep1() {
    return (
      <div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.docx,.pptx,.xlsx,.doc,.ppt,.xls"
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files) onFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          className="h-dash"
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: "100%",
            background: "#1C1C18",
            border: "1px dashed #55524A",
            borderRadius: 8,
            padding: "44px 24px",
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 700 }}>Drop files here, or click to browse</div>
          <div style={{ marginTop: 8, fontSize: 13, color: "#9A968A" }}>
            PDF, JPG, PNG, DOCX, PPTX, XLSX · max 25 MB per file
          </div>
        </button>

        <div style={{ marginTop: 24, display: "flex", flexDirection: "column" }}>
          {files.map((f) => {
            const needsPages = f.pages <= 0;
            const badgeColor =
              f.kind === "pdf" ? "#F08A8A" : f.kind === "image" ? "#6FCF8E" : "#FFC400";
            const meta = needsPages
              ? "page count needed"
              : f.kind === "image"
              ? "1 page · image"
              : f.kind === "pdf"
              ? `${f.pages} pages · parsed by pdf.js`
              : `${f.pages} pages`;
            return (
              <div key={f.id} style={{ borderBottom: "1px solid #2E2E29", padding: "18px 4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div
                    className={mono}
                    style={{
                      width: 40,
                      height: 40,
                      flex: "none",
                      borderRadius: 6,
                      border: `1px solid ${badgeColor}`,
                      color: badgeColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {f.ext}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {f.name}
                    </div>
                    <div style={{ fontSize: 13, color: "#9A968A", marginTop: 2 }}>{meta}</div>
                  </div>
                  <button
                    className="h-remove"
                    onClick={() => removeFile(f.id)}
                    style={{
                      background: "none",
                      border: 0,
                      color: "#6E6B62",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Remove
                  </button>
                </div>
                {needsPages && (
                  <div
                    style={{
                      marginTop: 14,
                      marginLeft: 56,
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#E8B25C" }}>
                      How many pages in this file?
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={f.pages > 0 ? f.pages : ""}
                      onChange={(e) => setFilePages(f.id, Number(e.target.value))}
                      style={{
                        width: 90,
                        padding: "9px 11px",
                        border: "1px solid #3E3E36",
                        borderRadius: 6,
                        background: "#1C1C18",
                      }}
                    />
                    <div style={{ fontSize: 12.5, color: "#9A968A" }}>
                      The shop verifies the count; price may adjust and you&apos;ll be emailed.
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {files.length === 0 && (
          <div style={{ marginTop: 20, fontSize: 13.5, color: "#6E6B62" }}>
            No files yet — everything starts here.
          </div>
        )}
      </div>
    );
  }

  /* ---------------------------- file tabs --------------------------- */
  function fileTabs() {
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {files.map((f) => {
          const on = f.id === (activeFile ? activeFile.id : "");
          return (
            <button
              key={f.id}
              onClick={() => setActiveId(f.id)}
              style={{
                borderRadius: 6,
                padding: "8px 13px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                maxWidth: 200,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                ...(on
                  ? { background: "#FFC400", color: "#111", border: "1px solid #FFC400" }
                  : { background: "#1C1C18", color: "#F2F0E9", border: "1px solid #3E3E36" }),
              }}
            >
              {f.name}
            </button>
          );
        })}
      </div>
    );
  }

  /* ============================= STEP 2 ============================= */
  function renderStep2() {
    if (!activeFile) return null;
    const p = activeFile.prefs;
    const groupLabel = (t: string) => <div style={kicker}>{t}</div>;
    const row: React.CSSProperties = {
      marginTop: 10,
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
    };
    return (
      <div>
        {fileTabs()}

        <div
          className="grid-2"
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "repeat(2,minmax(0,1fr))",
            gap: "32px 48px",
          }}
        >
          <div>
            {groupLabel("PAPER SIZE")}
            <div style={row}>
              {(["A4", "A3", "A5", "Legal", "Letter"] as PaperSize[]).map((s) => (
                <Chip key={s} label={s} selected={p.size === s} onClick={() => patchPrefs({ size: s })} />
              ))}
            </div>
          </div>
          <div>
            {groupLabel("COLOUR")}
            <div style={row}>
              {([["bw", "B/W"], ["color", "Colour"]] as [ColorMode, string][]).map(([v, l]) => (
                <Chip key={v} label={l} selected={p.color === v} onClick={() => patchPrefs({ color: v })} />
              ))}
            </div>
          </div>
          <div>
            {groupLabel("SIDES")}
            <div style={row}>
              {([["single", "Single-sided"], ["double", "Double-sided"]] as [Sides, string][]).map(
                ([v, l]) => (
                  <Chip key={v} label={l} selected={p.sides === v} onClick={() => patchPrefs({ sides: v })} />
                )
              )}
            </div>
          </div>
          <div>
            {groupLabel("ORIENTATION")}
            <div style={row}>
              {([["portrait", "Portrait"], ["landscape", "Landscape"]] as [Orientation, string][]).map(
                ([v, l]) => (
                  <Chip key={v} label={l} selected={p.orient === v} onClick={() => patchPrefs({ orient: v })} />
                )
              )}
            </div>
          </div>
          <div>
            {groupLabel("COPIES")}
            <div
              style={{
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                border: "1px solid #3E3E36",
                borderRadius: 6,
                overflow: "hidden",
                background: "#1C1C18",
                width: "fit-content",
              }}
            >
              <button
                onClick={() => patchPrefs({ copies: Math.max(1, p.copies - 1) })}
                style={{
                  background: "#26261F",
                  border: 0,
                  padding: "10px 16px",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                  color: "#FFC400",
                }}
              >
                −
              </button>
              <div style={{ width: 52, textAlign: "center", fontSize: 15, fontWeight: 700 }}>
                {p.copies}
              </div>
              <button
                onClick={() => patchPrefs({ copies: p.copies + 1 })}
                style={{
                  background: "#26261F",
                  border: 0,
                  padding: "10px 16px",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                  color: "#FFC400",
                }}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => setMoreOpen((v) => !v)}
          style={{
            marginTop: 32,
            background: "none",
            border: 0,
            padding: 0,
            fontSize: 13.5,
            fontWeight: 700,
            color: "#FFC400",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          {moreOpen ? "− Fewer options" : "+ More options"}
        </button>

        {moreOpen && (
          <div
            className="grid-2"
            style={{
              marginTop: 20,
              display: "grid",
              gridTemplateColumns: "repeat(2,minmax(0,1fr))",
              gap: "32px 48px",
              borderTop: "1px solid #2E2E29",
              paddingTop: 24,
            }}
          >
            <div>
              {groupLabel("PAPER QUALITY")}
              <div style={row}>
                {(
                  [
                    ["70", "70 GSM"],
                    ["80", "80 GSM"],
                    ["100", "100 GSM +₹1"],
                    ["glossy", "Glossy +₹15"],
                  ] as [Gsm, string][]
                ).map(([v, l]) => (
                  <Chip key={v} label={l} selected={p.gsm === v} onClick={() => patchPrefs({ gsm: v })} />
                ))}
              </div>
            </div>
            <div>
              {groupLabel("PAGES PER SIDE")}
              <div style={row}>
                {([1, 2, 4] as Nup[]).map((v) => (
                  <Chip key={v} label={String(v)} selected={p.nup === v} onClick={() => patchPrefs({ nup: v })} />
                ))}
              </div>
            </div>
            <div>
              {groupLabel("PAGE RANGE")}
              <input
                type="text"
                placeholder="All pages — or 1-5, 8"
                value={p.range}
                onChange={(e) => patchPrefs({ range: e.target.value })}
                style={{ ...inputStyle, marginTop: 10 }}
              />
            </div>
            <div>
              {groupLabel("NOTES FOR THE SHOP")}
              <input
                type="text"
                placeholder="e.g. print pages 2–4 in colour only"
                value={p.notes}
                onChange={(e) => patchPrefs({ notes: e.target.value })}
                style={{ ...inputStyle, marginTop: 10 }}
              />
            </div>
          </div>
        )}

        <div style={{ marginTop: 36, borderTop: "1px solid #2E2E29", paddingTop: 24 }}>
          <div style={kickerLg}>WHOLE ORDER</div>
          <div
            className="grid-2"
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "repeat(2,minmax(0,1fr))",
              gap: "32px 48px",
            }}
          >
            <div>
              {groupLabel("BINDING")}
              <div style={row}>
                {(
                  [
                    ["none", "None"],
                    ["staple", "Staple · free"],
                    ["spiral", "Spiral · ₹40"],
                    ["hard", "Hard · ₹150"],
                  ] as [Binding, string][]
                ).map(([v, l]) => (
                  <Chip key={v} label={l} selected={binding === v} onClick={() => setBinding(v)} />
                ))}
              </div>
            </div>
            <div>
              {groupLabel("LAMINATION")}
              <div style={row}>
                {([["none", "None"], ["perpage", "Per page · ₹20"]] as [Lamination, string][]).map(
                  ([v, l]) => (
                    <Chip key={v} label={l} selected={lamination === v} onClick={() => setLamination(v)} />
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ============================= STEP 3 ============================= */
  function renderStep3() {
    if (!activeFile) return null;
    const p = activeFile.prefs;
    const cost = computeFileCost(activeFile);
    const previewSummary = [
      p.size,
      p.color === "color" ? "Colour" : "B/W",
      p.sides === "double" ? "Double-sided" : "Single-sided",
      p.orient === "portrait" ? "Portrait" : "Landscape",
      `${p.copies} cop${p.copies > 1 ? "ies" : "y"}`,
    ].join(" · ");

    const sheetCount = Math.min(6, Math.max(1, cost.sidesPerCopy));
    const landscape = p.orient === "landscape";
    const cols = p.nup === 1 ? 1 : 2;
    const blockColor = p.color === "color" ? "#FFC400" : "#C9CDD4";

    return (
      <div>
        {fileTabs()}
        <div
          style={{
            marginTop: 18,
            fontSize: 13.5,
            color: "#C9C6BC",
            borderLeft: "2px solid #FFC400",
            paddingLeft: 14,
          }}
        >
          {previewSummary}
        </div>

        <div
          style={{
            marginTop: 26,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
            gap: 20,
          }}
        >
          {Array.from({ length: sheetCount }).map((_, i) => {
            const isBack = p.sides === "double" && i % 2 === 1;
            const label = `Sheet ${i + 1}${isBack ? " · back" : ""}`;
            return (
              <div key={i}>
                <div
                  style={{
                    background: "#FCFCFA",
                    border: isBack ? "1px dashed #55524A" : "1px solid #3E3E36",
                    height: landscape ? 110 : 190,
                    borderRadius: 4,
                    padding: 10,
                    overflow: "hidden",
                    filter: p.color === "bw" ? "grayscale(1)" : undefined,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${cols},1fr)`,
                      gridTemplateRows: p.nup === 4 ? "repeat(2,1fr)" : "1fr",
                      gap: 6,
                      height: "100%",
                    }}
                  >
                    {Array.from({ length: p.nup }).map((__, c) => (
                      <div
                        key={c}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                          padding: 5,
                          background: "#FCFCFA",
                          overflow: "hidden",
                        }}
                      >
                        <div style={{ height: 3, width: "50%", background: "#C9CDD4", marginBottom: 2 }} />
                        <div style={{ height: 2, background: "#C9CDD4" }} />
                        <div style={{ height: 2, background: "#C9CDD4" }} />
                        <div style={{ height: 2, background: "#C9CDD4", width: "70%" }} />
                        <div style={{ height: 12, width: "35%", background: blockColor, margin: "3px 0" }} />
                        <div style={{ height: 2, background: "#C9CDD4" }} />
                        <div style={{ height: 2, background: "#C9CDD4", width: "55%" }} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className={mono} style={{ fontSize: 11.5, color: "#9A968A", marginTop: 7 }}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 20, fontSize: 12.5, color: "#6E6B62", lineHeight: 1.5 }}>
          Rendered with pdf.js in production — thumbnails reflect colour, N-up and single/double side.
        </div>
      </div>
    );
  }

  /* ============================= STEP 4 ============================= */
  function renderStep4() {
    return (
      <div>
        <div
          style={{
            border: "1px solid #2E2E29",
            background: "#23231E",
            height: 220,
            position: "relative",
            overflow: "hidden",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(#ffffff12 1px,transparent 1px),linear-gradient(90deg,#ffffff12 1px,transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          {BRANCHES.map((b, i) => {
            const sel = b.id === branchId;
            const pos = MAP_PINS[i] ?? { l: "50%", t: "50%" };
            return (
              <div
                key={b.id}
                onClick={() => {
                  setBranchId(b.id);
                  setDistance(demoKm(i));
                }}
                className={mono}
                style={{
                  position: "absolute",
                  left: pos.l,
                  top: pos.t,
                  transform: "translate(-50%,-50%)",
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: sel ? "#FFC400" : "#1C1C18",
                  color: sel ? "#111" : "#F2F0E9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  border: "2px solid #3E3E36",
                  boxShadow: "0 2px 6px rgba(0,0,0,.25)",
                  cursor: "pointer",
                }}
              >
                {i + 1}
              </div>
            );
          })}
          <div
            className={mono}
            style={{
              position: "absolute",
              left: 12,
              bottom: 10,
              fontSize: 10.5,
              color: "#9A968A",
              background: "#1C1C18d8",
              padding: "4px 8px",
              borderRadius: 4,
            }}
          >
            Leaflet + OpenStreetMap
          </div>
        </div>

        <div
          className="grid-2"
          style={{
            marginTop: 22,
            display: "grid",
            gridTemplateColumns: "repeat(2,minmax(0,1fr))",
            gap: 12,
          }}
        >
          {BRANCHES.map((b, i) => {
            const sel = b.id === branchId;
            return (
              <button
                key={b.id}
                onClick={() => {
                  setBranchId(b.id);
                  setDistance(demoKm(i));
                }}
                style={{
                  textAlign: "left",
                  background: "#1C1C18",
                  border: sel ? "1px solid #FFC400" : "1px solid #2E2E29",
                  boxShadow: sel ? "0 0 0 1px #FFC400" : "none",
                  borderRadius: 8,
                  padding: 16,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 15.5, fontWeight: 700 }}>{b.name}</div>
                  <div
                    className={mono}
                    style={{ fontSize: 12, fontWeight: 700, color: "#FFC400" }}
                  >
                    {demoKm(i).toFixed(1)} km
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#FFC400",
                    fontWeight: 700,
                    letterSpacing: ".06em",
                    marginTop: 2,
                  }}
                >
                  {b.brand.toUpperCase()}
                </div>
                <div style={{ fontSize: 12.5, color: "#C9C6BC", marginTop: 8, lineHeight: 1.5 }}>
                  {b.address}
                </div>
                <div style={{ fontSize: 12.5, color: "#9A968A", marginTop: 6 }}>
                  {b.hours} · {b.phone}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ============================= STEP 5 ============================= */
  function renderStep5() {
    const ruleBoxStyle: React.CSSProperties = {
      marginTop: 16,
      borderLeft: free ? "2px solid #6FCF8E" : "2px solid #E8B25C",
      paddingLeft: 16,
    };
    return (
      <div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {([["delivery", "Home delivery"], ["pickup", "Pickup from shop"]] as [
            "delivery" | "pickup",
            string
          ][]).map(([v, l]) => (
            <Chip key={v} label={l} selected={deliveryType === v} onClick={() => setDeliveryType(v)} />
          ))}
        </div>

        {deliveryType === "delivery" && (
          <div
            className="grid-2"
            style={{
              marginTop: 24,
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
              gap: 32,
            }}
          >
            <div>
              <div style={kicker}>DELIVERY ADDRESS</div>
              <input
                type="text"
                placeholder="Flat / building / street"
                value={addr.line1}
                onChange={(e) => setAddr({ ...addr, line1: e.target.value })}
                style={{ ...inputStyle, marginTop: 10 }}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <input
                  type="text"
                  placeholder="Area"
                  value={addr.area}
                  onChange={(e) => setAddr({ ...addr, area: e.target.value })}
                  style={{ ...inputStyle, flex: 1, width: "auto" }}
                />
                <input
                  type="text"
                  placeholder="Pincode"
                  value={addr.pin}
                  onChange={(e) => setAddr({ ...addr, pin: e.target.value })}
                  style={{ ...inputStyle, width: 120 }}
                />
              </div>
              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13.5,
                }}
              >
                <div style={{ color: "#9A968A" }}>Distance from {branchName}</div>
                <div className={mono} style={{ fontWeight: 700 }}>
                  {distance.toFixed(1)} km
                </div>
              </div>
              <input
                type="range"
                min={0.4}
                max={12}
                step={0.1}
                value={distance}
                onChange={(e) => setDistance(Number(e.target.value))}
                style={{ width: "100%", marginTop: 10 }}
              />
              <div style={{ fontSize: 11.5, color: "#6E6B62" }}>
                Prototype: drag to simulate the geocoded distance.
              </div>
            </div>
            <div>
              <div
                style={{
                  border: "1px solid #2E2E29",
                  background: "#23231E",
                  height: 150,
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage:
                      "linear-gradient(#ffffff12 1px,transparent 1px),linear-gradient(90deg,#ffffff12 1px,transparent 1px)",
                    backgroundSize: "26px 26px",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "46%",
                    transform: "translate(-50%,-50%)",
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#FFC400",
                    border: "3px solid #3E3E36",
                    boxShadow: "0 3px 8px rgba(0,0,0,.25)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 10,
                    bottom: 8,
                    fontSize: 10.5,
                    color: "#9A968A",
                    background: "#1C1C18d8",
                    padding: "4px 8px",
                    borderRadius: 4,
                  }}
                >
                  Drag the pin to fix your location
                </div>
              </div>
              <div style={ruleBoxStyle}>
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".02em" }}>
                  {free ? "FREE delivery" : "Delivery charges at actuals"}
                </div>
                <div style={{ fontSize: 12.5, marginTop: 5, lineHeight: 1.55, color: "#C9C6BC" }}>
                  {free
                    ? `Within ${config.freeDeliveryRadiusKm} km and over ₹500 — Virat arranges and pays the courier.`
                    : "Sent as a Cash-on-Delivery courier (Uber/Rapido parcel); you pay the delivery partner directly on receipt."}
                </div>
              </div>
            </div>
          </div>
        )}

        {deliveryType === "pickup" && (
          <div style={{ marginTop: 24, borderLeft: "2px solid #FFC400", paddingLeft: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Pick up from {branchName}</div>
            <div
              style={{
                fontSize: 13,
                color: "#C9C6BC",
                marginTop: 5,
                lineHeight: 1.55,
                maxWidth: 480,
              }}
            >
              {selectedBranch.address}
            </div>
            <div style={{ fontSize: 13, color: "#6FCF8E", fontWeight: 700, marginTop: 8 }}>
              Pickup is free — we message you when it&apos;s ready.
            </div>
          </div>
        )}

        <div
          className="grid-2"
          style={{
            marginTop: 36,
            borderTop: "1px solid #2E2E29",
            paddingTop: 24,
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
            gap: 48,
          }}
        >
          {config.paymentMode === "manual" ? (
            <div>
              <div style={kickerLg}>PAY BY UPI</div>
              <div style={{ marginTop: 16, display: "flex", gap: 18, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 120,
                    height: 120,
                    flex: "none",
                    border: "1px solid #2E2E29",
                    borderRadius: 8,
                    background:
                      "repeating-conic-gradient(#1A1A1A 0% 25%, #ffffff 0% 50%) 50%/14px 14px",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 41,
                      background: "#fff",
                      borderRadius: 3,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 8,
                      fontWeight: 800,
                      color: "#111",
                      textAlign: "center",
                      lineHeight: 1.2,
                    }}
                  >
                    QR
                    <br />
                    placeholder
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={kicker}>UPI ID</div>
                  <div
                    className={mono}
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      marginTop: 5,
                      wordBreak: "break-all",
                    }}
                  >
                    {selectedBranch.upiId}
                  </div>
                  <a
                    href={`upi://pay?pa=${selectedBranch.upiId}&pn=Virat%20Enterprises&am=${order.total}`}
                    style={{
                      display: "inline-block",
                      marginTop: 12,
                      border: "1px solid #FFC400",
                      color: "#FFC400",
                      fontSize: 13,
                      fontWeight: 700,
                      padding: "9px 14px",
                      borderRadius: 6,
                    }}
                  >
                    Open UPI app
                  </a>
                </div>
              </div>
              <div style={{ ...kicker, marginTop: 18 }}>UPI REFERENCE / UTR</div>
              <input
                type="text"
                placeholder="12-digit UTR from your payment app"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                className={mono}
                style={{ ...inputStyle, marginTop: 10 }}
              />
              <div style={{ fontSize: 12, color: "#6E6B62", marginTop: 8 }}>
                Order stays &ldquo;payment pending verification&rdquo; until the shop confirms in the
                bank app.
              </div>
            </div>
          ) : (
            <div>
              <div style={kickerLg}>PAY SECURELY</div>
              <div
                style={{
                  fontSize: 13.5,
                  color: "#C9C6BC",
                  marginTop: 14,
                  lineHeight: 1.6,
                  maxWidth: 380,
                }}
              >
                UPI, cards, netbanking and wallets via Razorpay Checkout. Payment confirms
                automatically via webhook.
              </div>
              <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["UPI", "Cards", "Netbanking", "Wallets"].map((m) => (
                  <div
                    key={m}
                    style={{
                      border: "1px solid #3E3E36",
                      borderRadius: 4,
                      padding: "7px 11px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#C9C6BC",
                    }}
                  >
                    {m}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={kickerLg}>YOUR DETAILS</div>
            <input
              type="text"
              placeholder="Name"
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
              style={{ ...inputStyle, marginTop: 16 }}
            />
            <input
              type="tel"
              placeholder="Mobile number"
              value={custPhone}
              onChange={(e) => setCustPhone(e.target.value)}
              style={{ ...inputStyle, marginTop: 10 }}
            />
            <div style={{ fontSize: 12, color: "#6E6B62", marginTop: 8 }}>
              Guest checkout — no account needed. We offer to save your details after the order.
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =========================== SUMMARY ============================= */
  function renderSummary() {
    const nextStyle: React.CSSProperties = canContinue
      ? {
          width: "100%",
          background: "#FFC400",
          color: "#111",
          border: 0,
          borderRadius: 6,
          padding: "14px",
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
        }
      : {
          width: "100%",
          background: "#26261F",
          color: "#6E6B62",
          border: 0,
          borderRadius: 6,
          padding: "14px",
          fontSize: 15,
          fontWeight: 700,
          cursor: "not-allowed",
        };

    return (
      <div
        className="order-summary"
        style={{
          position: "sticky",
          top: 88,
          border: "1px solid #2E2E29",
          borderRadius: 8,
          background: "#1C1C18",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #2E2E29",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: ".08em",
          }}
        >
          ORDER SUMMARY
        </div>
        <div style={{ padding: "14px 20px 4px", minHeight: 70 }}>
          {order.lines.map((l, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                fontSize: 13,
                padding: "7px 0",
                borderBottom: "1px solid #26261F",
              }}
            >
              <div style={{ color: "#C9C6BC", lineHeight: 1.4 }}>{l.label}</div>
              <div style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{inr(l.amount)}</div>
            </div>
          ))}
          {order.filesWithPages === 0 && (
            <div style={{ fontSize: 13, color: "#6E6B62", padding: "7px 0" }}>
              Add files to see the price.
            </div>
          )}
        </div>
        <div
          style={{
            padding: "14px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700 }}>Total</div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", color: "#FFC400" }}>
            {inr(order.total)}
          </div>
        </div>
        <div style={{ padding: "0 20px 16px", fontSize: 12, color: "#9A968A", lineHeight: 1.5 }}>
          {order.totalSheets} sheets · {order.filesWithPages} files · updates live
        </div>
        <div style={{ padding: "0 20px 20px" }}>
          <button onClick={handleNext} className={canContinue ? "h-orange" : undefined} style={nextStyle}>
            {step < 5 ? "Continue" : "Place order"}
          </button>
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              style={{
                marginTop: 10,
                width: "100%",
                background: "none",
                border: 0,
                color: "#9A968A",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              ← Back
            </button>
          )}
        </div>
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #2E2E29",
            fontSize: 11.5,
            color: "#9A968A",
            lineHeight: 1.5,
          }}
        >
          Free delivery within {config.freeDeliveryRadiusKm} km on orders above{" "}
          {inr(config.freeDeliveryMinOrder)}. Minimum order ₹20.
        </div>
      </div>
    );
  }

  /* ========================= CONFIRMATION ========================== */
  function renderConfirmation() {
    const manual = config.paymentMode === "manual";
    const payload: OrderPayload = {
      orderNo,
      branchName,
      files,
      binding,
      lamination,
      deliveryType,
      address:
        deliveryType === "delivery"
          ? `${addr.line1}, ${addr.area} ${addr.pin}`.trim()
          : undefined,
      distanceKm: distance,
      freeDelivery: free,
      total: order.total,
      utr,
      custName,
      custPhone,
    };
    const waUrl = buildOrderWhatsappUrl(payload);
    const trackerLabels = [
      "Received",
      "Payment pending verification",
      "Printing",
      "Ready",
      deliveryType === "delivery" ? "Out for delivery" : "Ready for pickup",
    ];
    const doneCount = 2;

    return (
      <div style={{ maxWidth: 640, margin: "24px auto 0" }}>
        <div style={{ ...kickerLg, color: "#6FCF8E" }}>ORDER PLACED</div>
        <h1 style={{ margin: "12px 0 0", fontSize: 40, fontWeight: 800, letterSpacing: "-.025em" }}>
          {manual ? "Payment reference received." : "Payment successful."}
        </h1>
        <p style={{ margin: "14px 0 0", fontSize: 15, color: "#C9C6BC", lineHeight: 1.6 }}>
          {manual
            ? "We've got your UPI reference. Your order is confirmed the moment the shop verifies the payment in their bank app — usually within a few minutes. Attach your files on WhatsApp so we can start printing."
            : "Your payment went through and your order is confirmed. Attach your files on WhatsApp so the shop can start printing right away."}
        </p>

        <div
          style={{
            marginTop: 24,
            border: "1px solid #2E2E29",
            borderRadius: 8,
            background: "#1C1C18",
            padding: "18px 22px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div>
            <div style={kicker}>ORDER NUMBER</div>
            <div className={mono} style={{ fontSize: 17, fontWeight: 600, marginTop: 4 }}>
              {orderNo}
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#FFC400" }}>{inr(order.total)}</div>
        </div>

        <div style={{ marginTop: 28, borderTop: "1px solid #2E2E29", paddingTop: 22 }}>
          <div style={kickerLg}>TRACK YOUR ORDER</div>
          <div style={{ marginTop: 18 }}>
            {trackerLabels.map((label, i) => {
              const done = i < doneCount;
              const last = i === trackerLabels.length - 1;
              return (
                <div key={label} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      flex: "none",
                      width: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        flex: "none",
                        background: done ? "#6FCF8E" : "#121210",
                        border: done ? "0" : "2px solid #57544B",
                      }}
                    />
                    {!last && (
                      <div
                        style={{
                          width: 2,
                          minHeight: 22,
                          flex: 1,
                          background: i < doneCount - 1 ? "#6FCF8E" : "#2E2E29",
                        }}
                      />
                    )}
                  </div>
                  <div style={{ paddingBottom: 16, display: "flex", gap: 12, alignItems: "baseline" }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: done ? 700 : 600,
                        color: done ? "#F2F0E9" : "#9A968A",
                      }}
                    >
                      {label}
                    </div>
                    <div className={mono} style={{ fontSize: 12, color: "#6E6B62" }}>
                      {done ? "now" : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: "#6E6B62" }}>
            Tracker link emailed to you — no login needed.
          </div>
        </div>

        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="h-orange"
          style={{
            display: "block",
            marginTop: 28,
            background: "#FFC400",
            color: "#111",
            border: 0,
            borderRadius: 6,
            padding: "15px 20px",
            fontSize: 15,
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          Send files &amp; confirm on WhatsApp
        </a>
        <div style={{ fontSize: 12.5, color: "#6E6B62", marginTop: 8, textAlign: "center" }}>
          Attach your files in the WhatsApp chat to finish.
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
          <button
            onClick={resetOrder}
            style={{
              background: "none",
              border: "1px solid #57544B",
              borderRadius: 6,
              padding: "13px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            New order
          </button>
        </div>
      </div>
    );
  }
}
