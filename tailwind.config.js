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
        "background-light": "#F3F4F6",
        "background-dark": "#111827",
        "card-light": "#FFFFFF",
        "card-dark": "#1F2937",
        "text-light": "#1F2937",
        "text-dark": "#F9FAFB",
        "subtext-light": "#6B7280",
        "subtext-dark": "#9CA3AF",
        "border-light": "#E5E7EB",
        "border-dark": "#374151"
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