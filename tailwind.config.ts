import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#121210",
        surface: "#1C1C18",
        ink: "#F2F0E9",
        // Key names kept ("blue"/"orange") to avoid breaking existing classes;
        // both now resolve to the yellow accent per docs/THEME_DARK.md.
        blue: { DEFAULT: "#FFC400", hover: "#E6B000" },
        orange: { DEFAULT: "#FFC400", hover: "#E6B000" },
        body: "#C9C6BC",
        label: "#9A968A",
        hint: "#6E6B62",
        hair: "#2E2E29",
        rowrule: "#26261F",
        inputborder: "#3E3E36",
        good: "#6FCF8E",
        bad: "#F08A8A",
        amber: "#E8B25C",
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      maxWidth: {
        page: "1240px",
      },
    },
  },
  plugins: [],
};

export default config;
