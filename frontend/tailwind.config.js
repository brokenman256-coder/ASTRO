/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#6D28D9",
          dark: "#4C1D95",
          light: "#A78BFA",
        },
        accent: "#F59E0B",
      },
    },
  },
  plugins: [],
};
