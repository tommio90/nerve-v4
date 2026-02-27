import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        "card-foreground": "rgb(var(--card-foreground) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        "muted-foreground": "rgb(var(--muted-foreground) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        violet: "#8B5CF6",
        cyan: "#06B6D4",
        emerald: "#10B981",
        proposed: "rgb(var(--status-proposed) / <alpha-value>)",
        progress: "rgb(var(--status-progress) / <alpha-value>)",
        complete: "rgb(var(--status-complete) / <alpha-value>)",
        failed: "rgb(var(--status-failed) / <alpha-value>)",
        deferred: "rgb(var(--status-deferred) / <alpha-value>)",
        glass: "rgb(var(--glass) / <alpha-value>)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backdropBlur: {
        glass: "16px",
      },
      boxShadow: {
        "violet-glow": "0 24px 60px -32px rgba(139, 92, 246, 0.75)",
        "cyan-glow": "0 24px 60px -36px rgba(6, 182, 212, 0.65)",
      },
      transitionTimingFunction: {
        synapse: "cubic-bezier(0.23, 1, 0.32, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
