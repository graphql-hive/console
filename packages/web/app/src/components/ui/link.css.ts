import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../styles/layered';
import { vars } from '../../styles/theme.css';

export const linkStyles = {
  root: recipe({
    base: component({
      fontWeight: vars.weight.medium,
      transitionProperty:
        'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: vars.transition.duration,
    }),
    variants: {
      variant: {
        primary: component({
          color: vars.color.accent.DEFAULT,
          '@media': {
            '(hover: hover)': {
              selectors: {
                '&:hover': { textDecorationLine: 'underline' },
              },
            },
          },
        }),
        secondary: component({
          color: vars.color.fg.secondary,
          '@media': {
            '(hover: hover)': {
              selectors: {
                '&:hover': { color: vars.color.fg.default },
              },
            },
          },
        }),
      },
    },
    defaultVariants: { variant: 'primary' },
  }),
};
