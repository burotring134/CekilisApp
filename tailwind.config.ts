import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          night: "#050810",
          navy: "#0d1426",
          card: "#131c33",
          ink: "#1a2545",
          teal: "#4dd9d6",
          cyan: "#7dd3fc",
          ice: "#a5f3fc",
          indigo: "#6366f1",
          violet: "#8b5cf6",
          accent: "#22d3ee",
          primary: "#4dd9d6",
          dark: "#050810",
        },
      },
      boxShadow: {
        glow: "0 0 60px -10px rgba(77, 217, 214, 0.55)",
        "glow-sm": "0 0 30px -8px rgba(77, 217, 214, 0.45)",
      },
      fontFamily: {
        sans: ["system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
