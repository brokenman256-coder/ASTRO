/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#FF7A1A",
          dark: "#E8590C",
          light: "#FF9F4D",
        },
        accent: "#C2410C",
        cream: "#FFF7ED",
      },
    },
  },
  plugins: [],
};
