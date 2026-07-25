"use client";

// Public order-status tracker — reachable from the confirmation email/WhatsApp
// link, no login needed (spec §4.7 / route §9). When Supabase is configured the
// live status is fetched by token; otherwise the page explains that live
// tracking activates once the backend is connected.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { inr } from "@/lib/format";
import { config } from "@/lib/config";

const STEPS = [
  { key: "RECEIVED", label: "Received" },
  { key: "PAYMENT_PENDING_VERIFICATION", label: "Payment pending verification" },
  { key: "PAID", label: "Paid" },
  { key: "PRINTING", label: "Printing" },
  { key: "READY", label: "Ready" },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery / ready for pickup" },
  { key: "COMPLETED", label: "Completed" },
];

interface TrackedOrder {
  order_no: string;
  status: string;
  delivery_type: "pickup" | "delivery";
  total: number;
  created_at: string;
}

export default function OrderTrackerPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const [state, setState] = useState<"loading" | "live" | "demo">("loading");
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/orders?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j?.order) {
          setOrder(j.order as TrackedOrder);
          setState("live");
        } else {
          setState("demo");
        }
      })
      .catch(() => !cancelled && setState("demo"));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const currentIdx = order ? Math.max(0, STEPS.findIndex((s) => s.key === order.status)) : 1;
  const cancelled = order?.status === "CANCELLED";

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "56px 20px 96px" }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".2em", color: "#8A8578" }}>
        TRACK YOUR ORDER
      </div>
      <h1 style={{ margin: "12px 0 0", fontSize: 40, fontWeight: 800, letterSpacing: "-.025em" }}>
        {state === "live" ? "Order status" : "Order tracking"}
      </h1>

      <div
        style={{
          marginTop: 24,
          border: "1px solid #E7E4DC",
          borderRadius: 8,
          background: "#fff",
          padding: "18px 22px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", color: "#8A8578" }}>
            {state === "live" ? "ORDER NUMBER" : "TRACKING TOKEN"}
          </div>
          <div className="mono" style={{ fontSize: 17, fontWeight: 600, marginTop: 4, wordBreak: "break-all" }}>
            {order?.order_no ?? token}
          </div>
        </div>
        {order ? (
          <div style={{ fontSize: 26, fontWeight: 800, color: "#1B3A6B" }}>{inr(order.total)}</div>
        ) : null}
      </div>

      {state === "loading" && (
        <div style={{ marginTop: 28, fontSize: 14, color: "#8A8578" }}>Checking status…</div>
      )}

      {state === "live" && order && !cancelled && (
        <div style={{ marginTop: 28, borderTop: "1px solid #E7E4DC", paddingTop: 22 }}>
          {STEPS.map((s, i) => {
            const done = i <= currentIdx;
            const last = i === STEPS.length - 1;
            return (
              <div key={s.key} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "none", width: 14 }}>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: done ? "#1F6B3E" : "#fff",
                      border: done ? "none" : "1px solid #D8D2C4",
                    }}
                  />
                  {!last && <div style={{ width: 2, height: 26, background: done ? "#1F6B3E" : "#E7E4DC" }} />}
                </div>
                <div style={{ paddingBottom: 14, fontSize: 14, fontWeight: done ? 700 : 500, color: done ? "#1A1A1A" : "#B0AB9F" }}>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {state === "live" && cancelled && (
        <div style={{ marginTop: 28, borderLeft: "2px solid #B23B3B", paddingLeft: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#B23B3B" }}>This order was cancelled.</div>
          <div style={{ fontSize: 13.5, color: "#55524A", marginTop: 6, lineHeight: 1.6 }}>
            If a payment was made, the refund is being processed. Questions? Message the shop on WhatsApp.
          </div>
        </div>
      )}

      {state === "demo" && (
        <div style={{ marginTop: 28, borderLeft: "2px solid #8A5A22", paddingLeft: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#8A5A22" }}>
            Live tracking isn&rsquo;t connected yet.
          </div>
          <div style={{ fontSize: 13.5, color: "#55524A", marginTop: 6, lineHeight: 1.6, maxWidth: 480 }}>
            This shop currently confirms order status on WhatsApp. Message us with your order number and
            we&rsquo;ll reply with the latest update — live tracking on this page activates once the shop&rsquo;s
            backend is connected.
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
        <a
          href={`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(
            `Hi, checking the status of my order ${order?.order_no ?? `(token ${token})`}.`
          )}`}
          target="_blank"
          rel="noreferrer"
          className="h-blue"
          style={{ background: "#1B3A6B", color: "#fff", borderRadius: 6, padding: "13px 20px", fontSize: 14, fontWeight: 700 }}
        >
          Ask on WhatsApp
        </a>
        <Link
          href="/order"
          className="h-outline"
          style={{ border: "1px solid #C9C4B8", borderRadius: 6, padding: "13px 20px", fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}
        >
          New order
        </Link>
      </div>
    </div>
  );
}
