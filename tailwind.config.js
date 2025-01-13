/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors');
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    './assets/**/*.{liquid,js}',
    './frontend/**/*.{js,jsx}',
    './layout/**/*.liquid',
    './sections/**/*.liquid',
    './snippets/**/*.liquid',
    './templates/**/*.liquid',
  ],
  theme: {
    screens: {
      'mobile': {'max': '767px'},
      '2xs': '410px',
      xs: '480px',
      ...defaultTheme.screens,
    },
    extend: {
      animation: {
        bounceFromLeft: 'bounceFromLeft 0.5s linear forwards',
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
        action: {
          DEFAULT: 'rgb(var(--color-action))',
          80: 'rgba(var(--color-action), 0.8)',
          70: 'rgba(var(--color-action), 0.7)',
        },
        'breadcrumb-main': 'var(--color-breadcrumb-main)',
        'breadcrumb-secondary': 'var(--color-breadcrumb-secondary)',
        main: {
          DEFAULT: 'rgb(var(--color-main-rgb))',
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
        secondary: {
          DEFAULT: 'rgb(var(--color-secondary-rgb))',
          50: 'rgba(var(--color-secondary-rgb), 0.5)',
        },
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
        bounceFromLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '40%': { transform: 'translateX(0)' },
          '70%': { transform: 'translateX(-8%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
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
    'before:w-full',
    'before:w-1/4',
    'before:w-1/2',
    'before:w-3/4',
    'before:w-[60%]',
    'before:w-[70%]',
    'before:w-[80%]',
    'before:w-[90%]',
    '-right-0',
    '-right-1/4',
  ],
};
