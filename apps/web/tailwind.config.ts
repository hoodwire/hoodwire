import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx,jsx}", "./components/**/*.{ts,tsx,jsx}"],
  theme: {
    extend: {
      colors: {
        hw: {
          bg: "#0B0E0C",
          lime: "#C6F53E",
          ink: "#EDEFEA",
          mute: "#8A9484",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
