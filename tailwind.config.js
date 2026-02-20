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
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
      },
      fontSize: {
        'mobile-lg': ['1.125rem', { lineHeight: '1.5' }],
        'mobile-xl': ['1.25rem', { lineHeight: '1.4' }],
        'mobile-2xl': ['1.5rem', { lineHeight: '1.3' }],
        'mobile-3xl': ['1.875rem', { lineHeight: '1.2' }],
      },
    },
  },
  plugins: [],
}
