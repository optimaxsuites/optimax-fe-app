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
    },
  },
  plugins: [],
};
