/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{html,ts,scss}"],
  theme: {
    extend: {
      colors: {
        customBlue: "#2E6276",
        customGreen: "#2EB270",
        customBlueHover: "#4291b1",
        customGreenHover: "#47e797",
      },
      keyframes: {
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.3s ease-out',
      },
    },
  },
  plugins: [],
};

