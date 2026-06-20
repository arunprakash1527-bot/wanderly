import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Calm, exam-focused palette.
        ink: {
          DEFAULT: '#1f2933',
          soft: '#3e4c59',
          faint: '#7b8794',
        },
        brand: {
          50: '#eef6ff',
          100: '#d9ecff',
          500: '#2f6fed',
          600: '#1f5bd6',
          700: '#1947ad',
        },
        sand: '#f7f5f0',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
