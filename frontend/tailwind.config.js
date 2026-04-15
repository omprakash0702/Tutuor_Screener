/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-left': {
          '0%':   { opacity: '0', transform: 'translateX(-18px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-right': {
          '0%':   { opacity: '0', transform: 'translateX(18px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pop-in': {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
          '60%':  { transform: 'scale(1.02)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'bar-fill': {
          '0%': { width: '0%' },
        },
      },
      animation: {
        'fade-in':    'fade-in 0.35s ease-out forwards',
        'slide-left':  'slide-left 0.3s cubic-bezier(0.25,0.46,0.45,0.94) forwards',
        'slide-right': 'slide-right 0.3s cubic-bezier(0.25,0.46,0.45,0.94) forwards',
        'pop-in':     'pop-in 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'bar-fill':   'bar-fill 1s ease-out forwards',
      },
    },
  },
  plugins: [],
}
