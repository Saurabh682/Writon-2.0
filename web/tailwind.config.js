/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['Newsreader', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        editorial: {
          bg: '#FAFAF8',
          card: '#FFFFFF',
          text: '#1C1C1E',
          muted: '#6B7280',
          border: '#E8E5DF',
          accent: '#B83A24',
          accentHover: '#9A2E1A',
          amber: '#D97706',
          amberBg: '#FEF3C7',
        },
        darkEditorial: {
          bg: '#121316',
          card: '#1A1C20',
          text: '#F3F4F6',
          muted: '#9CA3AF',
          border: '#2A2D35',
          accent: '#E05A47',
          accentHover: '#F26E5B',
        }
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'lift': '0 10px 30px -4px rgba(0, 0, 0, 0.08)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.07)',
      }
    },
  },
  plugins: [],
}
