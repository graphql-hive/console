/* eslint-disable import/no-extraneous-dependencies */
import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';
import tailwindcssRadix from 'tailwindcss-radix';
import { fontFamily } from 'tailwindcss/defaultTheme';
import { default as flattenColorPalette } from 'tailwindcss/lib/util/flattenColorPalette';
import plugin from 'tailwindcss/plugin';
import tailwindTypography from '@tailwindcss/typography';
import baseConfig from '@theguild/tailwind-config';

const config: Config = {
  ...baseConfig,
  theme: {
    ...baseConfig.theme,
    extend: {
      ...baseConfig.theme.extend,
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
        display: ['var(--font-sans)', ...fontFamily.sans],
      },
      colors: {
        ...baseConfig.theme.extend.colors,
        primary: baseConfig.theme.extend.colors['hive-yellow'],
        "nextra-primary": baseConfig.theme.extend.colors.primary,
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0', opacity: '0' },
          to: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
          to: { height: '0', opacity: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.5s ease',
        'accordion-up': 'accordion-up 0.5s ease',
      },
    },
  },
  plugins: [
    tailwindcssRadix({ variantPrefix: 'rdx' }),
    tailwindcssAnimate,
    blockquotesPlugin(),
    tailwindTypography,
  ],
};

export default config;

function blockquotesPlugin() {
  return plugin(({ addUtilities, matchUtilities, theme }) => {
    addUtilities({
      '.mask-image-none': {
        'mask-image': 'none',
      },
    });
    matchUtilities(
      {
        blockquote: color => ({
          position: 'relative',
          quotes: '"“" "”" "‘" "’"',
          '&:before, &:after': {
            lineHeight: '0',
            position: 'relative',
            fontSize: '2.25em',
            display: 'inline-block',
            verticalAlign: 'middle',
            width: '0',
            color,
          },
          '&:before': {
            content: 'open-quote',
            left: '-0.375em',
          },
          '&:after': {
            content: 'close-quote',
          },
        }),
      },
      {
        values: flattenColorPalette(theme('colors')),
        type: 'color',
      },
    );
  });
}
