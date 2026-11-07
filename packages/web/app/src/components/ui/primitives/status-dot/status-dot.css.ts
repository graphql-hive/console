import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../../styles/layered';
import { square } from '../../../../styles/space';
import { vars } from '../../../../styles/theme.css';

export const statusDotStyles = {
  root: recipe({
    base: component({ display: 'inline-block', flexShrink: 0, borderRadius: vars.radius.full }),
    variants: {
      color: {
        success: component({ backgroundColor: vars.color.success.DEFAULT }),
        warning: component({ backgroundColor: vars.color.warning.DEFAULT }),
        critical: component({ backgroundColor: vars.color.critical.DEFAULT }),
        info: component({ backgroundColor: vars.color.info.DEFAULT }),
        neutral: component({ backgroundColor: vars.color.neutral[9] }),
      },
      size: {
        default: component(square(2)),
      },
    },
    defaultVariants: { color: 'neutral', size: 'default' },
  }),
};
