/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        amp: {
          orange: "#ff6105",
          glow: "#ffa069",
          peach: "#ffdfcd",
          ink: "#0a0a0a",
          carbon: "#292b2a",
          slate: "#7a7b7b",
          ash: "#a2a3a2",
          hairline: "#e5e5e5",
          fog: "#dfe0df",
          bone: "#e5e7eb",
          white: "#ffffff",
          linen: "#f3f4f3",
          charcoal: "#202120",
          smoke: "#3c3e3d",
        },
        gym: {
          dark: "#0b0f19",
          card: "#111827",
          border: "#1f2937",
          accent: "#3b82f6",
          accentHover: "#2563eb",
          gold: "#f59e0b",
          success: "#10b981",
        },
      },
    },
  },
  plugins: [],
};
