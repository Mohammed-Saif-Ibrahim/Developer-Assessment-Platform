import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0a0a0a",
          900: "#111111",
          800: "#1a1a1a",
          700: "#262626",
          600: "#404040",
          500: "#595959",
          400: "#7a7a7a",
          300: "#a3a3a3",
          200: "#d4d4d4",
          100: "#e8e8e8",
          50: "#f5f5f5",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
