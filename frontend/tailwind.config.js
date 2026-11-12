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
        ink: {
          950: "#090b17",
          900: "#101426",
          850: "#151a2d",
          800: "#1b2238",
          750: "#222b43",
          700: "#2b3550",
          600: "#394661",
        },
        accent: {
          DEFAULT: "#b9e86a",
          light: "#e3ffac",
          soft: "#c9ef88",
          dark: "#92c84b",
          deep: "#49682d",
        },
        emerald: {
          50: "#f2ffe0",
          100: "#e5ffc1",
          200: "#d1f89c",
          300: "#c4ef7f",
          400: "#b9e86a",
          500: "#9ccc4c",
          600: "#78a33b",
          700: "#5c7d32",
          800: "#405a2b",
          900: "#2c4025",
          950: "#1b2b1d",
        },
        status: {
          urgent: "#ff917a",
          warning: "#f4c767",
          info: "#85d9e8",
          success: "#b9e86a",
          neutral: "#9ca3af",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Nunito Sans Variable",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: [
          "var(--font-display)",
          "Fredoka Variable",
          "Nunito Sans",
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
        "accent-gradient": "linear-gradient(135deg, #d6ff92 0%, #a9dd5b 100%)",
        "panel-gradient": "linear-gradient(145deg, #1d2540 0%, #141a2d 100%)",
      },
      animation: {
        "pulse-accent": "pulse-accent 2.4s ease-in-out infinite",
        float: "float 7s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
      },
      keyframes: {
        "pulse-accent": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(185,232,106,0.28)" },
          "50%": { boxShadow: "0 0 0 8px rgba(185,232,106,0)" },
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
