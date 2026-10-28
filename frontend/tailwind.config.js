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
        /* Preto profundo + verde claro forte (identidade IFNMG) */
        ink: {
          950: "#040504",
          900: "#070907",
          850: "#0a0d0a",
          800: "#0e110e",
          750: "#121612",
          700: "#171c17",
          600: "#1f271f",
        },
        accent: {
          DEFAULT: "#45ff9c",
          light: "#c8ffe0",
          soft: "#8dffbe",
          dark: "#16d96a",
          deep: "#0a6c3a",
        },
        status: {
          urgent: "#ff5f6d",
          warning: "#ffc857",
          info: "#7dd3fc",
          success: "#45ff9c",
          neutral: "#8a978d",
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
        glow: "0 0 0 1px rgba(69, 255, 156, 0.16), 0 18px 60px -24px rgba(69, 255, 156, 0.35)",
        "glow-sm": "0 0 24px -6px rgba(69, 255, 156, 0.35)",
        panel: "0 40px 120px -60px rgba(0, 0, 0, 0.9)",
      },
      backgroundImage: {
        "accent-gradient": "linear-gradient(135deg, #c8ffe0 0%, #45ff9c 45%, #16d96a 100%)",
        "panel-gradient":
          "linear-gradient(155deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.012) 38%, rgba(255,255,255,0) 100%)",
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
