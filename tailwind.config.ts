import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        golf: {
          primary: '#16a34a',
          secondary: '#15803d',
          accent: '#22c55e',
          bg: '#f0fdf4',
        },
      },
    },
  },
  plugins: [],
};

export default config;
