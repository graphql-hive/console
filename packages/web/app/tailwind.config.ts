import svgToDataUri from 'mini-svg-data-uri';
import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';
import colors from 'tailwindcss/colors';
import { fontFamily } from 'tailwindcss/defaultTheme';
import flattenColorPalette from 'tailwindcss/lib/util/flattenColorPalette';
import plugin from 'tailwindcss/plugin';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.ts{,x}'],
  important: true,
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        sm: '100%',
        md: '100%',
        lg: '100%',
        xl: '100%',
        '2xl': '1800px',
      },
    },
    fontFamily: {
      sans: [
        'Inter var,' + fontFamily.sans.join(','),
        {
          fontFeatureSettings: 'normal',
          fontVariationSettings: '"opsz" 32',
        },
      ],
      mono: fontFamily.mono,
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      white: '#fcfcfc',
      black: '#0b0d11',
      emerald: colors.emerald,
      red: {
        50: '#fef5f5',
        100: '#fdeaeb',
        200: '#fbcbce',
        300: '#f8abb0',
        400: '#f26d74',
        500: '#ed2e39',
        600: '#d52933',
        700: '#b2232b',
        800: '#8e1c22',
        900: '#74171c',
      },
      yellow: {
        50: '#fffcf2',
        100: '#fffae6',
        200: '#fff2bf',
        300: '#ffeb99',
        400: '#ffdb4d',
        500: '#fc0',
        600: '#e6b800',
        700: '#bf9900',
        800: '#997a00',
        900: '#7d6400',
      },
      green: {
        50: '#f2fcf9',
        100: '#e6f8f3',
        200: '#bfeee1',
        300: '#99e3cf',
        400: '#4dcfac',
        500: '#00ba88',
        600: '#00a77a',
        700: '#008c66',
        800: '#007052',
        900: '#005b43',
      },
      cyan: '#0acccc',
      blue: colors.sky,
      gray: colors.stone,
      rose: colors.rose,
      pink: colors.pink,
      teal: colors.teal,
      indigo: colors.indigo,
      amber: colors.amber,
      lime: colors.lime,
      magenta: '#f11197',
      orange: {
        50: '#fefbf5',
        100: '#fef8ec',
        200: '#fcedcf',
        300: '#fbe2b3',
        400: '#f7cd79',
        500: '#f4b740',
        600: '#dca53a',
        700: '#b78930',
        800: '#926e26',
        900: '#785a1f',
      },
      zinc: colors.zinc,
      purple: colors.purple,
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'rgb(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xs: 'calc(var(--radius) - 6px)',
      },
      ringColor: ({ theme }) => ({
        DEFAULT: theme('colors.orange.500/75'),
        ...theme('colors'),
      }),
      keyframes: {
        // Tooltip
        'slide-up-fade': {
          '0%': { opacity: '0', transform: 'translateY(2px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-right-fade': {
          '0%': { opacity: '0', transform: 'translateX(-2px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-down-fade': {
          '0%': { opacity: '0', transform: 'translateY(-2px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-left-fade': {
          '0%': { opacity: '0', transform: 'translateX(2px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          from: {
            backgroundPosition: '0 0',
          },
          to: {
            backgroundPosition: '-200% 0',
          },
        },
        /** @source https://gist.github.com/krishaantechnology/245b29cfbb25eb456c09fce63673decc */
        shake: {
          '10%, 90%': {
            transform: 'translate3d(-1px, 0, 0)',
          },
          '20%, 80%': {
            transform: 'translate3d(2px, 0, 0)',
          },
          '30%, 50%, 70%': {
            transform: 'translate3d(-4px, 0, 0)',
          },
          '40%, 60%': {
            transform: 'translate3d(4px, 0, 0)',
          },
        },
      },
      animation: {
        'slide-up-fade': 'slide-up-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-right-fade': 'slide-right-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down-fade': 'slide-down-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-left-fade': 'slide-left-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 1.5s linear infinite',
        /** @source https://gist.github.com/krishaantechnology/245b29cfbb25eb456c09fce63673decc */
        shake: 'shake 0.82s cubic-bezier(.36,.07,.19,.97) both',
      },
      minHeight: {
        content: 'var(--content-height)',
      },
    },
  },
  plugins: [
    // Utilities and variants for styling Radix state
    tailwindcssAnimate,
    plugin(({ addBase, theme }) => {
      const allColors = flattenColorPalette(theme('colors'));
      const newVars = Object.fromEntries(
        Object.entries(allColors).map(([key, val]) => [`--${key}`, val]),
      );
      addBase({
        ':root': newVars,
      });
    }),
    plugin(({ matchUtilities, theme }) => {
      matchUtilities(
        {
          'bg-grid': value => ({
            backgroundImage: `url("${svgToDataUri(
              `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="${value}"><path d="M0 .5H31.5V32"/></svg>`,
            )}")`,
          }),
          'bg-grid-small': value => ({
            backgroundImage: `url("${svgToDataUri(
              `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="8" height="8" fill="none" stroke="${value}"><path d="M0 .5H31.5V32"/></svg>`,
            )}")`,
          }),
          'bg-dot': value => ({
            backgroundImage: `url("${svgToDataUri(
              `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="16" height="16" fill="none"><circle fill="${value}" id="pattern-circle" cx="10" cy="10" r="1.6257413380501518"></circle></svg>`,
            )}")`,
          }),
        },
        { values: flattenColorPalette(theme('backgroundColor')), type: 'color' },
      );
    }),
  ],
};

export default config;
