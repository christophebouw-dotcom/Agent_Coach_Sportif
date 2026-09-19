import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#b3ccff',
          300: '#82abff',
          400: '#4f82ff',
          500: '#2a5cf5',
          600: '#1c42d1',
          700: '#1832a3',
          800: '#172c81',
          900: '#182a66',
        },
      },
    },
  },
  plugins: [],
};

export default config;
