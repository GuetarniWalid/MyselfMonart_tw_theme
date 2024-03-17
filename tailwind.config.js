/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors');
const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  content: ['./**/*.{liquid,js,jsx,ts,tsx}'],
  theme: {
    screens: {
      '2xs': '410px',
      xs: '480px',
      ...defaultTheme.screens,
    },
    extend: {
      animation: {
        moveToLeft: 'moveToLeft infinite 8s linear',
        loading: 'loading 0.6s 0.1s linear infinite'
      },
      borderWidth: {
        '1': '1px',
      },
      boxShadow: {
        '3xl': '1px 12px 50px -1px rgba(0,0,0,0.1)',
        'button': '0px 0px 0px 1px #002E5D'
      },
      colors: {
        main: '#002E5D',
        secondary: '#F6F3EE', 
        action: '#04A777',
        'breadcrumb-main': colors.lime[950],
        'breadcrumb-secondary': '#EBD0CD',
      },
      fontFamily: {
        roboto: ['Roboto', 'sans-serif'],
        heading: ['heading', 'sans-serif'],
      },
      fontSize: {
        xs: '0.7rem',
        '2xs': '0.6rem',
      },
      keyframes: {
        moveToLeft: {
          '0%': {
            transform: 'translateX(0)',
          },
          '100%': {
            transform: 'translateX(-100%)',
          },
        },
        loading: {
          '0%': {
            transform: 'translate(0, 0)'
          },
          '50%': {
            transform: 'translate(0, 15px)'
          },
          '100%': {
            transform: 'translate(0, 0)'
          }
        }
      },
    },
  },
  plugins: [],
  safelist: [
    'grid-cols-1',
    'grid-cols-2',
    'md:grid-cols-1',
    'md:grid-cols-2',
    'md:grid-cols-3',
    'md:grid-cols-4',
    'md:col-span-3',
    'md:col-span-4',
    'md:col-span-6',
    'md:col-span-8',
    'md:col-span-9',
  ],
};
