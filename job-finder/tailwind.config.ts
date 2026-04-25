import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1280px" } },
    extend: {
      colors: {
        bg: "hsl(var(--bg))",
        surface: "hsl(var(--surface))",
        border: "hsl(var(--border))",
        muted: "hsl(var(--muted))",
        fg: "hsl(var(--fg))",
        "fg-muted": "hsl(var(--fg-muted))",
        accent: "hsl(var(--accent))",
        "accent-fg": "hsl(var(--accent-fg))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Inter", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.02)",
        pop: "0 8px 24px rgba(0,0,0,0.08)",
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.125rem" },
    },
  },
  plugins: [],
};
export default config;
