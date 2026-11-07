import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../styles/layered';
import { vars } from '../../styles/theme.css';

export const headingStyles = {
  root: recipe({
    base: component({
      cursor: 'default',
      color: vars.color.fg.DEFAULT,
    }),
    variants: {
      size: {
        lg: component({
          fontSize: vars.text.lg,
          lineHeight: vars.text.lgLineHeight,
          fontWeight: vars.weight.bold,
        }),
        xl: component({
          fontSize: vars.text.xl,
          lineHeight: vars.text.xlLineHeight,
          fontWeight: vars.weight.bold,
        }),
        '2xl': component({
          fontSize: '28px',
          lineHeight: vars.leading.snug,
          fontWeight: vars.weight.extrabold,
        }),
      },
    },
    defaultVariants: { size: 'xl' },
  }),
};
