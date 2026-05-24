import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Backwards-compat alias — older files still reference `brand-*`.
        // Maps onto the new teal scale so existing pages keep working.
        brand: {
          50:  '#eef6f4',
          100: '#d6e8e3',
          200: '#a9cfc6',
          300: '#77b1a4',
          400: '#4a8f80',
          500: '#2e6f62',
          600: '#23574e',
          700: '#1d463f',
          800: '#173934',
          900: '#0f2624',
        },
        // Editorial deep-teal + warm ink + cream — premium Australian-coastal mood
        ink: {
          50:  '#f7f6f3',
          100: '#ecebe6',
          200: '#d6d4cc',
          300: '#b4b1a4',
          400: '#8a8676',
          500: '#615e51',
          600: '#46443a',
          700: '#34322b',
          800: '#23221e',
          900: '#15140f',
        },
        teal: {
          50:  '#eef6f4',
          100: '#d6e8e3',
          200: '#a9cfc6',
          300: '#77b1a4',
          400: '#4a8f80',
          500: '#2e6f62',
          600: '#23574e',
          700: '#1d463f',
          800: '#173934',
          900: '#0f2624',
        },
        sand: {
          50:  '#fbf9f3',
          100: '#f4eedf',
          200: '#ecdfbd',
          300: '#dec99a',
          400: '#c9ab6e',
        },
        terracotta: {
          500: '#c45a3a',
          600: '#a8462a',
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
        card: '0 1px 2px rgba(15,38,36,0.04), 0 8px 24px -12px rgba(15,38,36,0.18)',
      },
    },
  },
  plugins: [],
};

export default config;
