/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          500: '#1a3c7c',
          600: '#152e63',
          700: '#0f2146',
        },
        accent: {
          500: '#b0133a',
          600: '#8c0f2e',
        },
        book: {
          card: '#ffffff',
          hover: '#f8f9fa',
        }
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

