import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Trustworthy modern-Australian palette
        // Deep eucalypt green + warm sand + coastal blue
        brand: {
          50:  '#f1f7f3',
          100: '#dceee2',
          200: '#bcdfc8',
          300: '#8fc8a5',
          400: '#5fab7e',
          500: '#3f8e62',
          600: '#2f724e',
          700: '#275b40',
          800: '#214835',
          900: '#1c3c2d',
        },
        sand: {
          50:  '#fbf8f2',
          100: '#f4ecd9',
          200: '#e8d6ad',
        },
        coast: {
          500: '#1e6f9a',
          600: '#175a7e',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      fontSize: {
        // bump body for older demographic readability
        base: ['1.0625rem', { lineHeight: '1.65' }],
      },
      maxWidth: {
        prose: '70ch',
      },
    },
  },
  plugins: [],
};

export default config;
