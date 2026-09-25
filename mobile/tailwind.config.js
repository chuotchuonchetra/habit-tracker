/** @type {import('tailwindcss').Config} */
module.exports = {
  // The same class names the web app uses are what get scanned here, plus the
  // two shared modules that also carry class strings.
  content: ['./App.tsx', './src/**/*.{ts,tsx}', '../src/**/*.tsx'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#4f46e5',
          hover: '#6366f1',
        },
      },
    },
  },
  plugins: [],
}
