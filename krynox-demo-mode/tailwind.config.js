/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cyber-black': '#050505',
        'cyber-slate': '#0f172a',
        'cyber-green': '#00ffcc',
        'cyber-purple': '#9d4edd',
        'cyber-blue': '#00d4ff',
        'cyber-red': '#ff003c',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          'from': { textShadow: '0 0 10px #00ffcc, 0 0 20px #00ffcc' },
          'to': { textShadow: '0 0 20px #00ffcc, 0 0 30px #00ffcc' },
        }
      }
    },
  },
  plugins: [],
}
