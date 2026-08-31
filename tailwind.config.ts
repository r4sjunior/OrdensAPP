import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EDEFE8",
        paperDim: "#E3E5DC",
        ink: "#1F2A2E",
        inkSoft: "#4B5A5C",
        stamp: "#C1502E",
        stampDark: "#9C3D22",
        teal: "#2F6E62",
        line: "#C9CCC1",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};
export default config;
