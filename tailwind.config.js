/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0ea5e9',
          hover: '#0284c7',
          soft: '#e0f2fe',
        },
      },
    },
  },
  plugins: [],
};
