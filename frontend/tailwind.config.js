/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#142433",
          light: "#1F3A4D",
          soft: "#2A4A60",
        },
        paper: "#F6F4EE",
        ink: "#16262F",
        gold: {
          DEFAULT: "#C9932E",
          soft: "#E8C889",
        },
        sage: "#6B8F71",
        line: "#E4E0D6",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["General Sans", "Inter", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
      },
    },
  },
  plugins: [],
};
