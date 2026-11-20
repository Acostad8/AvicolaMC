/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        'twin-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.0)' },
          '50%':      { boxShadow: '0 0 0 10px rgba(239, 68, 68, 0.0), 0 0 0 4px rgba(239, 68, 68, 0.35)' },
        },
        'slide-in-right': {
          '0%':   { transform: 'translateX(100%)', opacity: 0 },
          '100%': { transform: 'translateX(0)',    opacity: 1 },
        },
        'fade-in': {
          '0%':   { opacity: 0, transform: 'scale(0.9)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        'mic-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.0)' },
          '50%':      { boxShadow: '0 0 0 6px rgba(239, 68, 68, 0.0), 0 0 0 2px rgba(239, 68, 68, 0.5)' },
        },
        'toast-in': {
          '0%':   { opacity: 0, transform: 'translateX(120%) scale(0.9)' },
          '60%':  { opacity: 1, transform: 'translateX(-4%) scale(1.02)' },
          '100%': { opacity: 1, transform: 'translateX(0) scale(1)' },
        },
        'toast-out': {
          '0%':   { opacity: 1, transform: 'translateX(0) scale(1)' },
          '100%': { opacity: 0, transform: 'translateX(120%) scale(0.95)' },
        },
      },
      animation: {
        'twin-pulse':     'twin-pulse 1.2s ease-in-out 2',
        'slide-in-right': 'slide-in-right 250ms ease-out',
        'fade-in':        'fade-in 200ms ease-out',
        'gradient-x':     'gradient-x 8s ease infinite',
        'mic-pulse':      'mic-pulse 1.5s ease-in-out infinite',
        'toast-in':       'toast-in 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        'toast-out':      'toast-out 250ms ease-in forwards',
      },
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
