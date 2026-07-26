"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { config, modeLabel } from "@/lib/config";

const NAV = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/order", label: "Order prints", match: (p: string) => p.startsWith("/order") },
  { href: "/admin", label: "Staff", match: (p: string) => p === "/admin" },
  { href: "/admin/reports", label: "Reports", match: (p: string) => p.startsWith("/admin/reports") },
  { href: "/franchise", label: "Franchise", match: (p: string) => p.startsWith("/franchise") },
];

export default function Header() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "#121210",
        borderBottom: "1px solid #2E2E29",
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "0 20px",
          height: 64,
          display: "flex",
          alignItems: "center",
          gap: 24,
          minWidth: 0,
        }}
      >
        {/* LOGO: replace with owner shop-board image when provided */}
        <Link
          href="/"
          style={{
            fontWeight: 800,
            letterSpacing: ".16em",
            fontSize: 14,
            whiteSpace: "nowrap",
            flex: "none",
            color: "#F2F0E9",
          }}
        >
          VIRAT ENTERPRISES
        </Link>

        <nav
          className="hidden md:flex"
          style={{ gap: 18, alignItems: "center", height: "100%", flex: "none" }}
        >
          {NAV.map((n) => {
            const active = n.match(pathname);
            return (
              <Link
                key={n.href}
                href={n.href}
                className="h-navlink"
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  fontSize: 13.5,
                  fontWeight: 600,
                  position: "relative",
                  whiteSpace: "nowrap",
                  color: active ? "#F2F0E9" : undefined,
                }}
              >
                {n.label}
                {active && (
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: -1,
                      height: 2,
                      background: "#FFC400",
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 14,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div
            className="mono hidden sm:block"
            style={{
              fontSize: 11,
              color: "#6E6B62",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {modeLabel}
          </div>
          <a
            href={`https://wa.me/${config.whatsappNumber}`}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:block"
            style={{ fontSize: 13, fontWeight: 600, color: "#FFC400", whiteSpace: "nowrap", flex: "none" }}
          >
            WhatsApp
          </a>
          <Link
            href="/order"
            className="h-blue"
            style={{
              background: "#FFC400",
              color: "#111",
              borderRadius: 6,
              padding: "10px 18px",
              fontSize: 13.5,
              fontWeight: 700,
              whiteSpace: "nowrap",
              flex: "none",
            }}
          >
            Order now
          </Link>
          <button
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="ve-burger"
            style={{
              background: "none",
              border: "1px solid #3E3E36",
              borderRadius: 6,
              padding: "8px 10px",
              cursor: "pointer",
              flex: "none",
            }}
          >
            <span style={{ display: "block", width: 16, height: 2, background: "#F2F0E9", transform: open ? "translateY(6px) rotate(45deg)" : "none", transition: "transform .15s" }} />
            <span style={{ display: "block", width: 16, height: 2, background: "#F2F0E9", opacity: open ? 0 : 1, transition: "opacity .15s" }} />
            <span style={{ display: "block", width: 16, height: 2, background: "#F2F0E9", transform: open ? "translateY(-6px) rotate(-45deg)" : "none", transition: "transform .15s" }} />
          </button>
        </div>
      </div>

      {open && (
        <nav
          className="md:hidden"
          style={{ borderTop: "1px solid #2E2E29", background: "#121210" }}
        >
          {NAV.map((n) => {
            const active = n.match(pathname);
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                style={{
                  display: "block",
                  padding: "14px 20px",
                  fontSize: 15,
                  fontWeight: active ? 700 : 600,
                  color: active ? "#FFC400" : "#F2F0E9",
                  borderBottom: "1px solid #26261F",
                  borderLeft: active ? "2px solid #FFC400" : "2px solid transparent",
                }}
              >
                {n.label}
              </Link>
            );
          })}
          <a
            href={`https://wa.me/${config.whatsappNumber}`}
            target="_blank"
            rel="noreferrer"
            style={{ display: "block", padding: "14px 20px", fontSize: 15, fontWeight: 600, color: "#FFC400" }}
          >
            WhatsApp us
          </a>
        </nav>
      )}
    </div>
  );
}
