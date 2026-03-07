import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand
        accent: { DEFAULT: '#0EA5E9', hover: '#0284C7' },
        // Dark theme
        dark: {
          base: '#06080F',
          surface: '#0D1117',
          elevated: '#111827',
          input: '#080B12',
          nav: '#0A0D14',
          border: '#1E293B',
          'border-hover': '#334155',
          'border-subtle': '#111827',
        },
        // Light theme
        light: {
          base: '#EBEEF3',
          surface: '#F5F6F8',
          elevated: '#E8ECF1',
          input: '#F0F2F5',
          nav: '#F5F6F8',
          border: '#B0BAC6',
          'border-hover': '#9AA4B2',
          'border-subtle': '#E4E8EE',
        },
        // Text (dark mode)
        dt: {
          1: '#F1F5F9',
          2: '#CBD5E1',
          3: '#64748B',
          4: '#475569',
          5: '#334155',
        },
        // Text (light mode)
        lt: {
          1: '#0A0F1A',
          2: '#1A2535',
          3: '#374151',
          4: '#4B5563',
          5: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['var(--font-display)', 'DM Sans', 'Segoe UI', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
