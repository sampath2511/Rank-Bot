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
        studio: {
          950: '#07090e',
          900: '#0c1017',
          850: '#111722',
          800: '#161e2e',
          700: '#1e293b',
          600: '#334155',
          500: '#64748b',
          accent: '#6366f1',
          'accent-hover': '#4f46e5',
          yellow: '#facc15',
          cyan: '#06b6d4',
          magenta: '#ec4899',
          emerald: '#10b981',
          orange: '#f97316',
        }
      },
      fontFamily: {
        impact: ['Impact', 'Arial Black', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
