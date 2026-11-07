import { recipe } from '@vanilla-extract/recipes';
import { layered } from '../../../../styles/layered';
import { square } from '../../../../styles/space';
import { vars } from '../../../../styles/theme.css';

const s = layered.components;

export const statusDotStyles = {
  root: recipe({
    base: s({ display: 'inline-block', flexShrink: 0, borderRadius: vars.radius.full }),
    variants: {
      color: {
        success: s({ backgroundColor: vars.color.success.DEFAULT }),
        warning: s({ backgroundColor: vars.color.warning.DEFAULT }),
        critical: s({ backgroundColor: vars.color.critical.DEFAULT }),
        info: s({ backgroundColor: vars.color.info.DEFAULT }),
        neutral: s({ backgroundColor: vars.color.neutral[9] }),
      },
      size: {
        default: s(square(2)),
      },
    },
    defaultVariants: { color: 'neutral', size: 'default' },
  }),
};
