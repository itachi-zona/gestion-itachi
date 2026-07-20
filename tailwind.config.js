/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "#080912",
        panel: "#111321",
        panel2: "#171a2c",
        border: "#292d46",
        accent: {
          DEFAULT: "#6d5bf6",
          light: "#9a8cff",
          dark: "#4c3fd6"
        },
        good: "#22c55e",
        warn: "#f59e0b",
        bad: "#ef4444"
      },
      fontFamily: {
        display: ["Orbitron", "sans-serif"],
        body: ["Rajdhani", "sans-serif"]
      },
      boxShadow: {
        glow: "0 16px 55px rgba(109, 91, 246, 0.18)"
      }
    }
  },
  plugins: []
};
