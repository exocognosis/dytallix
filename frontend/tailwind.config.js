/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Performance Dashboard Theme
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5', 
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        quantum: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        dashboard: {
          bg: '#000000',
          card: '#111827',
          'card-hover': '#1f2937',
          border: '#374151',
          'border-hover': '#06b6d4',
          success: '#10b981',
          text: '#ffffff',
          'text-muted': '#d1d5db',
          'text-gray': '#9ca3af',
        }
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': {
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)',
          },
          '100%': {
            boxShadow: '0 0 40px rgba(16, 185, 129, 0.8)',
          }
        }
      }
    },
  },
  plugins: [],
}
