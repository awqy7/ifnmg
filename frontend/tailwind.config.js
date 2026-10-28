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
        /* Grafite neutro + verde IFNMG (identidade) */
        ink: {
          950: "#08090a",
          900: "#0a0c0e",
          850: "#0d0f11",
          800: "#121417",
          750: "#171a1e",
          700: "#1b2026",
          600: "#242a31",
        },
        accent: {
          DEFAULT: "#45ff9c",
          light: "#c8ffe0",
          soft: "#8dffbe",
          dark: "#16d96a",
          deep: "#0a6c3a",
        },
        status: {
          urgent: "#f87171",
          warning: "#fbbf24",
          info: "#7dd3fc",
          success: "#45ff9c",
          neutral: "#9ca3af",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: [
          "var(--font-display)",
          "Space Grotesk",
          "Inter",
          "-apple-system",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255, 255, 255, 0.08)",
        "glow-sm": "0 0 0 1px rgba(255, 255, 255, 0.08)",
        panel: "0 16px 40px -24px rgba(0, 0, 0, 0.8)",
      },
      backgroundImage: {
        "accent-gradient": "linear-gradient(180deg, #45ff9c 0%, #2ee884 100%)",
        "panel-gradient": "none",
      },
      animation: {
        "pulse-accent": "pulse-accent 2.4s ease-in-out infinite",
        float: "float 7s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
      },
      keyframes: {
        "pulse-accent": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(69,255,156,0.28)" },
          "50%": { boxShadow: "0 0 0 8px rgba(69,255,156,0)" },
        },
        float: {
          "0%, 100%": { transform: "translate3d(0,0,0)" },
          "50%": { transform: "translate3d(0,-10px,0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
