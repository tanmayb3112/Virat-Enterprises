"use client";

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
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "#FAFAF8",
        borderBottom: "1px solid #E7E4DC",
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
        <Link
          href="/"
          style={{
            fontWeight: 800,
            letterSpacing: ".16em",
            fontSize: 14,
            whiteSpace: "nowrap",
            flex: "none",
            color: "#1A1A1A",
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
                  color: active ? "#1A1A1A" : undefined,
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
                      background: "#1B3A6B",
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
              color: "#B0AB9F",
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
            style={{ fontSize: 13, fontWeight: 600, color: "#1B3A6B", whiteSpace: "nowrap", flex: "none" }}
          >
            WhatsApp
          </a>
          <Link
            href="/order"
            className="h-blue"
            style={{
              background: "#1B3A6B",
              color: "#fff",
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
        </div>
      </div>
    </div>
  );
}
