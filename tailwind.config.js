/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        ink: {
          50: "#f6f7f8",
          100: "#e9ebee",
          400: "#7a8290",
          700: "#2a2f37",
          900: "#0e1116",
        },
        accent: {
          400: "#7dd3fc",
          500: "#38bdf8",
          600: "#0284c7",
        },
      },
    },
  },
  plugins: [],
};
