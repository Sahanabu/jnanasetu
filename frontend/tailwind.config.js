// Path: frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'selector',
  theme: {
    extend: {
      fontFamily: { sans: ['Nunito', 'sans-serif'] },
      colors: {
        brand: { DEFAULT: '7C3AED', light: 'EDE9FE', dark: '5B21B6' }
      },
      boxShadow: {
        card: '0 4px 0 0 rgba(0,0,0,0.12)'
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        wiggle: {
          '0%,100%': { transform: 'rotate(-6deg)' },
          '50%': { transform: 'rotate(6deg)' }
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      },
      animation: {
        pop: 'pop 0.3s ease-out',
        wiggle: 'wiggle 0.5s ease-in-out',
        slideUp: 'slideUp 0.4s ease-out'
      }
    }
  },
  plugins: []
}
