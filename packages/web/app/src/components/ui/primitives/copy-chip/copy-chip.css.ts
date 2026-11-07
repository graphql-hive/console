import { style } from '@vanilla-extract/css';
import { component } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import * as shared from '../../../../styles/shared.css';
import { vars } from '../../../../styles/theme.css';

// Plain rather than composed, because the copy icon's hover rule selects on it.
const chip = style(
  component({
    display: 'inline-flex',
    alignItems: 'center',
    gap: space(1.5),
    maxWidth: '100%',
    borderRadius: vars.radius.md,
  }),
);

export const copyChipStyles = {
  chip,
  text: style([shared.shrinkable, shared.truncate]),
  copiedIcon: shared.icon.xs,
  /** Hidden until the chip is hovered. */
  copyIcon: style([
    shared.icon.xs,
    component({
      opacity: 0,
      transitionProperty: 'opacity',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: vars.transition.duration,
      '@media': {
        '(hover: hover)': {
          selectors: { [`${chip}:hover &`]: { opacity: 1 } },
        },
      },
    }),
  ]),
};
