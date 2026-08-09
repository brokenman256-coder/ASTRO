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
        gold: "#F5B942",
        cream: "#FFF7ED",
        navy: "#1E2340",
        maroon: {
          DEFAULT: "#7A1230",
          dark: "#4A0A1C",
        },
        ash: {
          DEFAULT: "#8A8680",
          light: "#B8B4AC",
        },
        charcoal: {
          DEFAULT: "#0D0B0A",
          light: "#1A1614",
        },
        ember: {
          DEFAULT: "#FF4F1A",
          dark: "#B8300C",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        glow: "0 8px 30px -8px rgba(232, 89, 12, 0.45)",
        "glow-lg": "0 20px 60px -15px rgba(232, 89, 12, 0.5)",
        card: "0 2px 10px -2px rgba(88, 42, 4, 0.06)",
        "card-hover": "0 16px 40px -12px rgba(88, 42, 4, 0.18)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "0.9" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 2.5s linear infinite",
        "pulse-slow": "pulse-slow 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
