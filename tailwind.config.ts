import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ["Nunito", "sans-serif"],
        heading: ["Quintessential", "cursive"],
      },
      colors: {
        earth: {
          DEFAULT: "#8B5A2B",
          light: "#A9754A",
          dark: "#6B431F",
        },
        gold: {
          DEFAULT: "#D4A017",
          light: "#E6BB4A",
        },
        moss: {
          DEFAULT: "#4A7043",
          dark: "#37552F",
        },
        lagoon: {
          DEFAULT: "#2E8B8B",
          dark: "#236A6A",
        },
        cream: "#F8F1E9",
        ink: "#2C2C2C",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 4px 20px -6px rgba(139, 90, 43, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
