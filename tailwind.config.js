/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#0a0d14',
          card: '#121824',
          border: '#1f293d',
          neonCyan: '#00f0ff',
          neonGold: '#ffb703',
          neonPink: '#ff007f',
          neonPurple: '#a855f7',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 15px rgba(0, 240, 255, 0.6)' },
          '50%': { opacity: 0.8, boxShadow: '0 0 30px rgba(0, 240, 255, 0.9)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
