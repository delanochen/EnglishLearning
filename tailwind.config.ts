import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./modules/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--ink) / <alpha-value>)",
        paper: "rgb(var(--paper) / <alpha-value>)",
        brand: "rgb(var(--brand) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)"
      }
    }
  },
  plugins: []
} satisfies Config;
