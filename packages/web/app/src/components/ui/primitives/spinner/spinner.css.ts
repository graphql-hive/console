import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { layered } from '../../../../styles/layered';
import { square } from '../../../../styles/space';
import { animate } from '../../../../styles/animations.css';
import { vars } from '../../../../styles/theme.css';

const s = layered.components;

// The whole icon turns; the arc inside it breathes on its own timing.
const icon = style(s({ flexShrink: 0, animation: animate.spinnerSpin }));

globalStyle(`${icon} > path`, s({ animation: animate.spinnerArc }));

export const spinnerStyles = {
  root: recipe({
    base: icon,
    variants: {
      size: {
        xs: s(square(3)),
        sm: s(square(4)),
        default: s(square(6)),
        lg: s(square(8)),
      },
      tone: {
        accent: s({ color: vars.color.accent.DEFAULT }),
        current: {},
      },
    },
    defaultVariants: { size: 'default', tone: 'accent' },
  }),
};
