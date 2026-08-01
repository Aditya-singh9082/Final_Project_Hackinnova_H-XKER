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
          void: '#0B0F17',
          slate: '#111827',
          cyan: '#00F0FF',
          violet: '#7C3AED',
          emerald: '#10B981',
          accent: '#00F0FF',
          bg: '#0B0F17',
          card: 'rgba(17, 24, 39, 0.6)',
          border: 'rgba(0, 240, 255, 0.2)'
        },
        status: {
          safe: '#10B981',
          vuln: '#EF4444',
          warn: '#F59E0B'
        }
      },
      fontFamily: {
        sans: ['Inter', '"Plus Jakarta Sans"', 'sans-serif'],
        heading: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      }
    },
  },
  plugins: [],
}
