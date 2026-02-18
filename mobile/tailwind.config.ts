import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          cream: "#F5F0E8",
          tan: "#C4B19A",
          sand: "#D4C5AE",
          charcoal: "#3D4148",
          stone: "#6B6560",
          warmgray: "#8A827A",
          surface: "#EDE7DB",
          muted: "#A89F95",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
