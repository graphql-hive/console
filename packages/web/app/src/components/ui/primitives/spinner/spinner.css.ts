import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../../styles/layered';
import { square } from '../../../../styles/space';
import { animate } from '../../../../styles/animations.css';
import { vars } from '../../../../styles/theme.css';

// The whole icon turns; the arc inside it breathes on its own timing.
const icon = style(component({ flexShrink: 0, animation: animate.spinnerSpin }));

globalStyle(`${icon} > path`, component({ animation: animate.spinnerArc }));

export const spinnerStyles = {
  root: recipe({
    base: icon,
    variants: {
      size: {
        xs: component(square(3)),
        sm: component(square(4)),
        default: component(square(6)),
        lg: component(square(8)),
      },
      tone: {
        accent: component({ color: vars.color.accent.DEFAULT }),
        current: {},
      },
    },
    defaultVariants: { size: 'default', tone: 'accent' },
  }),
};
