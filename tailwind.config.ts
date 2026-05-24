import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Site palette is driven by five base colours:
        //   Primary    Deep Ocean Blue  #2F5D73  → teal/brand scale (at 500)
        //   Secondary  Soft Sage Green  #A7B8A0  → sage scale (at 300)
        //   Background Warm Sand        #F5F1E8  → sand scale (at 100)
        //   Accent     Muted Teal       #5E8B7E  → terracotta (legacy name kept)
        //   Text       Charcoal         #333333  → ink scale (at 800)
        // Other shades are tints/shades of the base so existing utility
        // classes (e.g. teal-900, ink-400, sand-50) keep working.
        brand: {
          50:  '#eef3f6',
          100: '#d8e2e8',
          200: '#b2c4cf',
          300: '#84a3b3',
          400: '#568297',
          500: '#2f5d73',
          600: '#264a5c',
          700: '#1f3e4d',
          800: '#18303c',
          900: '#0f1f29',
        },
        ink: {
          50:  '#f4f4f4',
          100: '#e5e5e5',
          200: '#cccccc',
          300: '#a8a8a8',
          400: '#7d7d7d',
          500: '#5a5a5a',
          600: '#444444',
          700: '#3a3a3a',
          800: '#333333',
          900: '#1f1f1f',
        },
        teal: {
          50:  '#eef3f6',
          100: '#d8e2e8',
          200: '#b2c4cf',
          300: '#84a3b3',
          400: '#568297',
          500: '#2f5d73',
          600: '#264a5c',
          700: '#1f3e4d',
          800: '#18303c',
          900: '#0f1f29',
        },
        sand: {
          50:  '#fbf9f2',
          100: '#f5f1e8',
          200: '#ebe3cf',
          300: '#d9cba9',
          400: '#c3ad7c',
        },
        sage: {
          50:  '#f1f4f0',
          100: '#dee4db',
          200: '#bfcbb9',
          300: '#a7b8a0',
          400: '#8aa280',
          500: '#6e8a65',
        },
        terracotta: {
          500: '#5e8b7e',
          600: '#4a7167',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      fontSize: {
        // Slightly larger body for older readers
        base: ['1.0625rem', { lineHeight: '1.65' }],
      },
      maxWidth: {
        prose: '70ch',
      },
      backgroundImage: {
        'hero-grain':
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>\")",
      },
      boxShadow: {
        card: '0 1px 2px rgba(47,93,115,0.05), 0 8px 24px -12px rgba(47,93,115,0.20)',
      },
    },
  },
  plugins: [],
};

export default config;
