/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          DEFAULT: '#d97706',
        },
        farm: {
          green: '#16a34a',
          'green-dark': '#15803d',
          'green-light': '#86efac',
          brown: '#92400e',
          cream: '#fef9f0',
          'cream-dark': '#fef3e2',
        },
      },
    },
  },
  plugins: [],
}
