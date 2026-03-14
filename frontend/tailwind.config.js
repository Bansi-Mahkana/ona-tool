/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Mono"', 'monospace'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ink: {
          50: '#f0f4f8',
          100: '#d9e4ee',
          200: '#b4c9de',
          300: '#80a5c5',
          400: '#4d7fa8',
          500: '#2d5f8a',
          600: '#1e4a70',
          700: '#153859',
          800: '#0e2540',
          900: '#08162a',
          950: '#040c18',
        },
        signal: {
          green: '#00d4a0',
          amber: '#f5a623',
          red: '#ff4757',
          blue: '#4fc3f7',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        }
      }
    },
  },
  plugins: [],
}
