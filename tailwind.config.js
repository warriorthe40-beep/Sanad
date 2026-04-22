/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#8b0000',
          hover: '#a80000',
          soft: '#2a0a0a',
        },
        surface: {
          DEFAULT: '#1a1a1e',
          elevated: '#232328',
          muted: '#2a2a30',
        },
      },
    },
  },
  plugins: [],
};
