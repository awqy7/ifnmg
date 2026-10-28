/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/contexts/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── IFNMG Brand Colors (validated 3-slot series) ── */
        "--ifnmgreen": "#34d399",      /* Série 1 — verde IFNMG (primária) */
        "--ifnmblue": "#3b82f6",      /* Série 2 — azul (contraste CVD) */
        "--ifnmamber": "#f59e0b",      /* Série 3 — âmbar (contraste CVD) */

        /* ── Surface Hierarchy ── */
        "--background": "#08080c",
        "--surface": "#101018",
        "--surface-elevated": "#14141e",
        "--surface-hover": "#1a1a26",
        "--surface-inset": "#0f0f17",

        /* ── Borders ── */
        "--border": "rgba(255, 255, 255, 0.04)",
        "--border-strong": "rgba(255, 255, 255, 0.08)",
        "--border-accent": "rgba(52, 211, 153, 0.2)",
        "--border-accent-soft": "rgba(52, 211, 153, 0.1)",

        /* ── Accent (verde IFNMG) ── */
        "--accent": "#34d399",
        "--accent-hover": "#2fb38a",
        "--accent-active": "#26a276",
        "--accent-dim": "rgba(52, 211, 153, 0.08)",
        "--accent-glow": "0 0 24px rgba(52, 211, 153, 0.12)",
        "--accent-border": "rgba(52, 211, 153, 0.15)",
        "--accent-soft": "rgba(52, 211, 153, 0.05)",

        /* ── Text hierarchy ── */
        "--text-primary": "#fafafa",
        "--text-secondary": "#a1a1aa",
        "--text-tertiary": "#71717a",
        "--text-muted": "#52525a",

        /* ── Enhanced Text Hierarchy for better readability ── */
        "--text-primary-enhanced": "#ffffff",
        "--text-secondary-enhanced": "#e5e5e5",
        "--text-tertiary-enhanced": "#d4d4d4",
        "--text-muted-enhanced": "#a3a3a3",

        /* ── Status colors (academic urgency) ── */
        "--status-urgent": "#ef4444",       /* vermelho — vence hoje */
        "--status-warning": "#f59e1b",      /* laranja — vence em 3 dias */
        "--status-info": "#3b82f8",      /* azul — normal */
        "--status-success": "#34d399",      /* verde — entregue */
        "--status-neutral": "#6b7280",     /* cinza — pendente sem data */

        /* ── Enhanced Shadows for premium feel and depth ── */
        "--shadow-sm": "0 1px 2px 0 rgba(0, 0, 0, 0.3)",
        "--shadow-md": "0 4px 6px -1px rgba(0, 0, 0, 0.35), 0 2px 4px -2px rgba(0, 0, 0, 0.25)",
        "--shadow-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)",
        "--shadow-xl": "0 20px 25px -5px rgba(0, 0, 0, 0.45), 0 10px 10px -5px rgba(0, 0, 0, 0.3)",
        "--shadow-accent": "0 0 20px rgba(52, 211, 153, 0.08)",
        "--shadow-floating": "0 4px 6px rgba(0, 0, 0, 0.3), 0 10px 15px rgba(0, 0, 0, 0.2)",
        "--shadow-elevated": "0 10px 25px rgba(0, 0, 0, 0.3), 0 20px 40px rgba(0, 0, 0, 0.2)",

        /* ── Enhanced Gradients with better depth and visual hierarchy ── */
        "--gradient-card": "linear-gradient(145deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.005) 100%)",
        "--gradient-accent": "linear-gradient(135deg, #34d399, #2fb38a)",
        "--gradient-accent-hover": "linear-gradient(135deg, #2fb38a, #26a276)",
        "--gradient-border": "linear-gradient(145deg, rgba(52, 211, 153, 0.15) 0%, rgba(52, 211, 153, 0.05) 100%)",
        "--gradient-surface": "linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 100%)",

        /* ── Enhanced Transition timing with better animation curves ── */
        "--ease-spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "--ease-spring-smooth": "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "--ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
        "--duration-fast": "150ms",
        "--duration-normal": "250ms",
        "--duration-slow": "400ms",
        "--duration-slowest": "600ms",

        /* ── Enhanced Z-index layers for better stacking ── */
        "--z-dropdown": "1000",
        "--z-sticky": "1020",
        "--z-fixed": "1030",
        "--z-modal": "1040",
        "--z-popover": "1050",
        "--z-tooltip": "1060",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        serif: ["Lora", "Georgia", "serif"],
        mono: ["ui-monaco", "monospace", "monospace"],
      },
      boxShadow: {
        "card-sm": "var(--shadow-sm)",
        "card-md": "var(--shadow-md)",
        "card-lg": "var(--shadow-lg)",
        "card-xl": "var(--shadow-xl)",
        "accent": "var(--shadow-accent)",
      },
      backgroundColor: {
        "surface-inset": "var(--surface-inset)",
      },
      borderColor: {
        accent: "var(--border-accent)",
        "accent-dim": "var(--accent-border)",
      },
      transitionTimingFunction: {
        spring: "var(--ease-spring)",
      },
      animation: {
        "pulse-accent": "pulse-accent 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
