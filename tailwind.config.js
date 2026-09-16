/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#ebf0fe',
          200: '#ced9fd',
          300: '#a3b7fb',
          400: '#728ff7',
          500: '#5e6ad2', // Linear-like blurple/indigo
          600: '#4850bf',
          700: '#393fa1',
          800: '#303582',
          900: '#2b2f6b',
        },
        surface: {
          DEFAULT: '#0f1117',
          elevated: '#161922',
          card: '#1b1f2b',
          border: '#262b3b',
          hover: '#242938',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(94, 106, 210, 0.2), 0 0 10px rgba(94, 106, 210, 0.1)' },
          '100%': { boxShadow: '0 0 15px rgba(94, 106, 210, 0.5), 0 0 20px rgba(94, 106, 210, 0.2)' },
        }
      }
    },
  },
  plugins: [],
}
