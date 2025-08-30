/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'node-beige': '#F5F5DC',
        'dark-blue': '#0F172A',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

