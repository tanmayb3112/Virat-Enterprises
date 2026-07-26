import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "96px 20px 128px", textAlign: "center" }}>
      <div className="mono" style={{ fontSize: 13, fontWeight: 800, color: "#FFC400", letterSpacing: ".2em" }}>
        404
      </div>
      <h1 style={{ margin: "16px 0 0", fontSize: 44, fontWeight: 800, letterSpacing: "-.03em", color: "#F2F0E9" }}>
        This page doesn&rsquo;t exist<span style={{ color: "#FFC400" }}>.</span>
      </h1>
      <p style={{ margin: "18px auto 0", fontSize: 15, lineHeight: 1.6, color: "#C9C6BC", maxWidth: 420 }}>
        The link may be old or mistyped. Everything a print shop can do for you is one tap away.
      </p>
      <div style={{ display: "flex", gap: 12, marginTop: 32, justifyContent: "center", flexWrap: "wrap" }}>
        <Link
          href="/order"
          className="h-orange"
          style={{ background: "#FFC400", color: "#111", borderRadius: 6, padding: "14px 24px", fontSize: 14.5, fontWeight: 700 }}
        >
          Order prints
        </Link>
        <Link
          href="/"
          className="h-outline"
          style={{ border: "1px solid #57544B", borderRadius: 6, padding: "14px 24px", fontSize: 14.5, fontWeight: 600, color: "#F2F0E9" }}
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
