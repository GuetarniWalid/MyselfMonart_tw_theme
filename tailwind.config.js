/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors');
const defaultTheme = require('tailwindcss/defaultTheme');

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
        loading: 'loading 0.6s 0.1s linear infinite',
      },
      borderWidth: {
        1: '1px',
      },
      boxShadow: {
        '3xl': '1px 12px 50px -1px rgba(0,0,0,0.1)',
        button: '0px 0px 0px 1px #002E5D',
      },
      colors: {
        action: 'var(--color-action)',
        'breadcrumb-main': 'var(--color-breadcrumb-main)',
        'breadcrumb-secondary': 'var(--color-breadcrumb-secondary)',
        main: {
          DEFAULT: 'var(--color-main)',
          90: 'rgba(var(--color-main-rgb), 0.9)',
          80: 'rgba(var(--color-main-rgb), 0.8)',
          75: 'rgba(var(--color-main-rgb), 0.75)',
          70: 'rgba(var(--color-main-rgb), 0.7)',
          50: 'rgba(var(--color-main-rgb), 0.5)',
          20: 'rgba(var(--color-main-rgb), 0.2)',
          10: 'rgba(var(--color-main-rgb), 0.1)',
          5: 'rgba(var(--color-main-rgb), 0.05)',
        },
        like: 'var(--color-like)',
        secondary: 'var(--color-secondary)',
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
            transform: 'translate(0, 0)',
          },
          '50%': {
            transform: 'translate(0, 15px)',
          },
          '100%': {
            transform: 'translate(0, 0)',
          },
        },
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
    'object-top',
    'object-bottom',
    'object-left',
    'object-right',
  ],
};
