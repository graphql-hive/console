import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../styles/layered';
import { vars } from '../../styles/theme.css';

export const hiveLogoStyles = {
  root: recipe({
    base: component({
      display: 'inline',
      fill: vars.color.fg.DEFAULT,
    }),
    variants: {
      // The overshoot curve stands in for the old framer-motion spring.
      animated: {
        true: component({
          '@media': {
            '(prefers-reduced-motion: no-preference)': {
              transitionProperty: 'transform, translate, scale, rotate',
              transitionDuration: '200ms',
              transitionTimingFunction: 'cubic-bezier(0.34,1.56,0.64,1)',
              selectors: {
                '&:active': { scale: '90% 90%' },
              },
            },
            '(prefers-reduced-motion: no-preference) and (hover: hover)': {
              selectors: {
                '&:hover': { scale: '110% 110%' },
              },
            },
          },
        }),
      },
    },
  }),
  path: style(component({ fill: vars.color.fg.DEFAULT })),
};
