import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../styles/layered';
import { vars } from '../../styles/theme.css';

export const textStyles = {
  root: recipe({
    base: component({ display: 'inline' }),
    variants: {
      arrangement: {
        inline: component({ display: 'inline' }),
        block: component({ display: 'block' }),
      },
      color: {
        primary: component({ color: vars.color.fg.DEFAULT }),
        secondary: component({ color: vars.color.fg.default }),
      },
      size: {
        'x-small': component({ fontSize: vars.text.xs, lineHeight: vars.text.xsLineHeight }),
        small: component({ fontSize: vars.text.sm, lineHeight: vars.text.smLineHeight }),
        medium: component({ fontSize: vars.text.base, lineHeight: vars.text.baseLineHeight }),
        large: component({ fontSize: vars.text.lg, lineHeight: vars.text.lgLineHeight }),
        'x-large': component({ fontSize: vars.text.xl, lineHeight: vars.text.xlLineHeight }),
      },
      weight: {
        normal: component({ fontWeight: vars.weight.normal }),
        medium: component({ fontWeight: vars.weight.medium }),
        semibold: component({ fontWeight: vars.weight.semibold }),
        bold: component({ fontWeight: vars.weight.bold }),
      },
      align: {
        left: component({ textAlign: 'left' }),
        center: component({ textAlign: 'center' }),
        right: component({ textAlign: 'right' }),
        justify: component({ textAlign: 'justify' }),
      },
    },
    defaultVariants: {
      arrangement: 'block',
      color: 'primary',
      size: 'medium',
      weight: 'normal',
    },
  }),
};
