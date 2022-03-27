const colors = require("tailwindcss/colors")

const extendColors = (color, main) => ({ ...color, DEFAULT: color[main] })

module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        primary: extendColors(colors.blue, "600"),
        secondary: extendColors(colors.red, "500"),
        background: {
          lightest: colors.white,
          lighter: "#F9F9FB",
          light: colors.slate["100"],
          dark: "#22252A",
          darker: "#16181D",
          darkest: colors.black,
        },
      },
    },
  },
  plugins: [],
}
