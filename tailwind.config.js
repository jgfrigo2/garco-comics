/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        spidey: {
          red: '#E23636',
          darkRed: '#B91C1C',
          blue: '#006494',
          darkBlue: '#004D74',
          black: '#1a1a1a',
          yellow: '#FBBF24',
        }
      },
      fontFamily: {
        comic: ['Bangers', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'comic-dots': "radial-gradient(#004D74 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
