import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Site palette is driven by the LLL brand pack:
        //   LLL Blue   #305A72  → teal/brand scale at 700 (sampled from the logo)
        //   Charcoal   #1A1A1A  → ink scale at 900 (body text)
        //   Muted text #6B7783  → ink scale at 500 (tints toward LLL Blue)
        //   Off-white  #F7F8F9  → ink scale at 50 (subtle panel backgrounds)
        //   Warm Sand  #F5F1E8  → sand scale at 100 (page background)
        //   Muted Teal #5E8B7E  → terracotta (accent, legacy name kept)
        //   Sage Green #A7B8A0  → sage scale at 300 (secondary accent)
        // Other shades are tints/shades of the base so existing utility
        // classes (e.g. teal-50, sand-50) keep working.
        brand: {
          50:  '#e1e8ee',
          100: '#d0dae3',
          200: '#a8bac7',
          300: '#83a0b2',
          400: '#5c7f95',
          500: '#467088',
          600: '#3a6580',
          700: '#305a72',
          800: '#234557',
          900: '#172f3d',
        },
        ink: {
          50:  '#f7f8f9',
          100: '#e8eaed',
          200: '#c9ced3',
          300: '#a8b0b7',
          400: '#88929b',
          500: '#6b7783',
          600: '#525c66',
          700: '#3a4148',
          800: '#25282b',
          900: '#1a1a1a',
        },
        teal: {
          50:  '#e1e8ee',
          100: '#d0dae3',
          200: '#a8bac7',
          300: '#83a0b2',
          400: '#5c7f95',
          500: '#467088',
          600: '#3a6580',
          700: '#305a72',
          800: '#234557',
          900: '#172f3d',
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
