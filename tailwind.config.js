/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hakeem: {
          emerald: '#064E3B',
          cream: '#FDFBF7',
          gold: '#D4AF37',
          sand: '#F5F5DC',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"Lato"', 'sans-serif'],
        arabic: ['"Amiri"', 'serif'],
      }
    },
  },
  plugins: [],
}