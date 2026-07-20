/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0b0b14",
        panel: "#12121f",
        panel2: "#181829",
        border: "#26263c",
        accent: {
          DEFAULT: "#6d5bf6",
          light: "#8b7bff",
          dark: "#4c3fd6"
        },
        good: "#22c55e",
        warn: "#f59e0b",
        bad: "#ef4444"
      },
      fontFamily: {
        display: ["Orbitron", "sans-serif"],
        body: ["Rajdhani", "sans-serif"]
      }
    }
  },
  plugins: []
};
