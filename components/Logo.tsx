// Brand lockup recreated from the owner's logo artwork: विराट in yellow with a
// thick red sticker outline, एंटरप्राइजेस in white with the same outline, and
// the red tagline. Inline SVG so we get paint-order:stroke (true outer
// sticker stroke) with the Baloo 2 Devanagari webfont.
//
// If /public/logo.png (the real artwork file) is committed to the repo, swap
// the SVG for <img src="/logo.png" .../> here — one-line change.

export default function Logo({ height = 44, tagline = true }: { height?: number; tagline?: boolean }) {
  const width = height * (tagline ? 3.1 : 3.4);
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 340 ${tagline ? 110 : 92}`}
      role="img"
      aria-label="Virat Enterprises — Naam hi Kaafi hai"
      style={{ display: "block", overflow: "visible" }}
    >
      <g style={{ fontFamily: "var(--font-baloo), sans-serif", fontWeight: 800 }}>
        <text
          x="0"
          y="48"
          fontSize="54"
          fill="#FFD200"
          stroke="#D8342A"
          strokeWidth="10"
          strokeLinejoin="round"
          style={{ paintOrder: "stroke" }}
        >
          विराट
        </text>
        <text
          x="0"
          y="84"
          fontSize="27"
          fill="#FFFFFF"
          stroke="#D8342A"
          strokeWidth="7"
          strokeLinejoin="round"
          style={{ paintOrder: "stroke" }}
        >
          एंटरप्राइजेस
        </text>
        {tagline && (
          <text x="0" y="107" fontSize="16" fontWeight="700" fill="#FF3B2F">
            नाम ही काफी है !
          </text>
        )}
      </g>
    </svg>
  );
}
