import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0D14",
        surface: "#121722",
        card: "#182030",
        border: "#232D42",
        primary: {
          DEFAULT: "#3B82F6",
          hover: "#2563EB",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#1E2638",
          foreground: "#94A3B8",
        },
        accent: {
          DEFAULT: "#10B981",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
      },
    },
  },
  plugins: [],
};

export default config;

