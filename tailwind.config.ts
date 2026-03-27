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
          primary: '#15803d',
          secondary: '#166534',
          accent: '#4ade80',
          muted: '#86efac',
          bg: '#f8faf9',
          surface: '#ffffff',
          'surface-hover': '#f0fdf4',
        },
      },
      fontFamily: {
        sans: [
          'Pretendard Variable', 'Pretendard', '-apple-system',
          'BlinkMacSystemFont', 'system-ui', 'Roboto', 'sans-serif',
        ],
        mono: ['JetBrains Mono', 'SF Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(21, 128, 61, 0.04), 0 4px 12px rgba(21, 128, 61, 0.03)',
        'card-hover': '0 4px 16px rgba(21, 128, 61, 0.08), 0 8px 24px rgba(21, 128, 61, 0.04)',
        'nav': '0 1px 0 rgba(21, 128, 61, 0.06)',
        'btn': '0 1px 2px rgba(21, 128, 61, 0.12), 0 0 0 1px rgba(21, 128, 61, 0.08)',
        'btn-hover': '0 2px 8px rgba(21, 128, 61, 0.16), 0 0 0 1px rgba(21, 128, 61, 0.12)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
};

export default config;
