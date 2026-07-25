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
        bg: "#FAFAF8",
        surface: "#FFFFFF",
        ink: "#1A1A1A",
        blue: { DEFAULT: "#1B3A6B", hover: "#142C51" },
        orange: { DEFAULT: "#F5821F", hover: "#E0741A" },
        body: "#55524A",
        label: "#8A8578",
        hint: "#B0AB9F",
        hair: "#E7E4DC",
        rowrule: "#F0EDE5",
        inputborder: "#D8D2C4",
        good: "#1F6B3E",
        bad: "#B23B3B",
        amber: "#8A5A22",
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
