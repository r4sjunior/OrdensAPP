import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F4F5F1",
        paperDim: "#E9EBE4",
        ink: "#1A2326",
        inkSoft: "#5A6769",
        stamp: "#D9552C",
        stampDark: "#A83F1F",
        teal: "#2F6E62",
        line: "#DDE0D7",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        soft: "0 1px 2px rgb(26 35 38 / 0.04), 0 8px 24px -8px rgb(26 35 38 / 0.10)",
        lift: "0 2px 4px rgb(26 35 38 / 0.06), 0 18px 40px -12px rgb(26 35 38 / 0.22)",
      },
      keyframes: {
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.6)" },
          "70%": { opacity: "1", transform: "scale(1.08)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        rise: {
          "0%": { transform: "scaleY(0)" },
          "100%": { transform: "scaleY(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shine: {
          "0%": { transform: "translateX(-120%) skewX(-20deg)" },
          "60%, 100%": { transform: "translateX(260%) skewX(-20deg)" },
        },
        sparkle: {
          "0%, 100%": { opacity: "0", transform: "scale(0.4) rotate(0deg)" },
          "50%": { opacity: "1", transform: "scale(1) rotate(90deg)" },
        },
        "sos-flash": {
          "0%, 100%": { opacity: "0" },
          "50%": { opacity: "1" },
        },
        "sos-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgb(239 68 68 / 0.7)" },
          "50%": { boxShadow: "0 0 0 8px rgb(239 68 68 / 0)" },
        },
      },
      animation: {
        "pop-in": "pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "slide-up": "slide-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-down": "slide-down 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.4s ease-out both",
        rise: "rise 0.8s cubic-bezier(0.22, 1, 0.36, 1) both",
        float: "float 3s ease-in-out infinite",
        shine: "shine 3.2s ease-in-out infinite",
        sparkle: "sparkle 2.4s ease-in-out infinite",
        "sos-flash": "sos-flash 1s ease-in-out infinite",
        "sos-glow": "sos-glow 1.2s ease-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
