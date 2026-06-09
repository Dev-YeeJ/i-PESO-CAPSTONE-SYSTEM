/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-navy': '#0F172A',
        'brand-gold': '#F59E0B',
        'brand-canvas': '#F8FAFC',
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e3a5f',
          900: '#172f50',
          950: '#0f172a',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        canvas: '#f8fafc',
        surface: '#ffffff',
      },
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['DM Serif Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.05)',
        elevated: '0 18px 45px rgba(15, 23, 42, 0.12)',
      },
    },
  },
  plugins: [],
}
