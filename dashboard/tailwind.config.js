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
          navy: '#0b132b',
          blue: '#1c2541',
          teal: '#3a506b',
          cyan: '#5bc0be',
          neon: '#00ffff'
        },
        status: {
          safe: '#00cc66',
          vuln: '#ff3333',
          warn: '#ffaa00'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'sans-serif'],
        mono: ['Fira Code', 'Courier New', 'monospace']
      }
    },
  },
  plugins: [],
}
