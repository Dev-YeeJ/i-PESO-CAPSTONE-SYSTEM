import tailwindcssAnimate from "tailwindcss-animate"

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-navy': '#123563',
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
        // Amber design-system scale (preserved). shadcn's `bg-accent` /
        // `text-accent-foreground` resolve to the DEFAULT/foreground below.
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        canvas: '#f8fafc',
        surface: '#ffffff',

        // ── shadcn/ui tokens (driven by CSS variables in main.css) ──
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // ── Semantic (additive; DESIGN_SYSTEM.md) ──
        success: { DEFAULT: '#16a34a', bg: '#f0fdf4' },
        warning: { DEFAULT: '#d97706', bg: '#fffbeb' },
        danger: { DEFAULT: '#dc2626', bg: '#fef2f2' },
        info: { DEFAULT: '#0369a1', bg: '#f0f9ff' },

        // ── Focus ring ──
        focus: '#2563eb',

        // ── Categorical chart palette (dataviz-validated, light: passes
        //    lightness/chroma/CVD). Mirrors src/design-system/chartColors.js ──
        chart: {
          1: '#2563eb', 2: '#f59e0b', 3: '#0d9488', 4: '#7c3aed',
          5: '#0369a1', 6: '#65a30d', 7: '#be185d', 8: '#b45309',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['DM Serif Display', 'Georgia', 'serif'],
      },
      maxWidth: {
        content: '1480px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.05)',
        elevated: '0 18px 45px rgba(15, 23, 42, 0.12)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
