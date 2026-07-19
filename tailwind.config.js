/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#4F46E5",
        "background-light": "#F8FAFC",
        "background-dark": "#0F172A",
        "card-light": "#FFFFFF",
        "card-dark": "#1E293B",
        "text-light": "#0F172A",
        "text-dark": "#F8FAFC",
        "subtext-light": "#64748B",
        "subtext-dark": "#94A3B8",
        "border-light": "#E2E8F0",
        "border-dark": "#334155"
      },
      fontFamily: {
        display: ["'Noto Sans SC'", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
      },
    },
  },
  plugins: [],
}