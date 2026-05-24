import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Site palette is driven by five base colours:
        //   Primary    Deep Ocean Blue  #2F5D73  → teal/brand scale (at 700, the button slot)
        //   Secondary  Soft Sage Green  #A7B8A0  → sage scale (at 300)
        //   Background Warm Sand        #F5F1E8  → sand scale (at 100)
        //   Accent     Muted Teal       #5E8B7E  → terracotta (legacy name kept)
        //   Text       Charcoal         #333333  → ink scale (at 900, the body-text slot)
        // Other shades are tints/shades of the base so existing utility
        // classes (e.g. teal-50, sand-50) keep working.
        brand: {
          50:  '#f0f5f8',
          100: '#dae6ec',
          200: '#b3cad6',
          300: '#82a8bb',
          400: '#5285a1',
          500: '#406e89',
          600: '#366380',
          700: '#2f5d73',
          800: '#234657',
          900: '#18303d',
        },
        ink: {
          50:  '#f7f7f7',
          100: '#ededed',
          200: '#d4d4d4',
          300: '#b0b0b0',
          400: '#888888',
          500: '#6b6b6b',
          600: '#525252',
          700: '#424242',
          800: '#3a3a3a',
          900: '#333333',
        },
        teal: {
          50:  '#f0f5f8',
          100: '#dae6ec',
          200: '#b3cad6',
          300: '#82a8bb',
          400: '#5285a1',
          500: '#406e89',
          600: '#366380',
          700: '#2f5d73',
          800: '#234657',
          900: '#18303d',
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
