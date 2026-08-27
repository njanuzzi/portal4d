/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        petrol: {
          50: '#e8f1f4',
          100: '#c5d9e0',
          200: '#9ebfcc',
          300: '#77a5b8',
          400: '#5991a9',
          500: '#3c7d9a',
          600: '#2d6a84',
          700: '#1B4B5A',
          800: '#153d4a',
          900: '#0e2f3a',
        },
        gold: {
          50: '#fdf8ec',
          100: '#f8eccc',
          200: '#f2dfa9',
          300: '#ecd186',
          400: '#e6c46a',
          500: '#C9A84C',
          600: '#b8943a',
          700: '#9a7a28',
          800: '#7c6118',
          900: '#5e480a',
        },
        beige: {
          50: '#fdfaf5',
          100: '#f9f3e8',
          200: '#F4EDE0',
          300: '#E8DCC8',
          400: '#d9c9ae',
          500: '#c9b594',
          600: '#b8a07a',
          700: '#9a8260',
          800: '#7c6448',
          900: '#5e4832',
        },
        dark: '#2C2C2C',
        coral: {
          50: '#fff2ef',
          100: '#f8d8d2',
          300: '#dc9286',
          500: '#bf675b',
          700: '#93463d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
