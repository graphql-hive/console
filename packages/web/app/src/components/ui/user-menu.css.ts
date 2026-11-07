import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../styles/layered';
import { space } from '../../styles/space';
import { animate } from '../../styles/animations.css';
import * as shared from '../../styles/shared.css';

export const userMenuStyles = {
  root: style(
    component({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(8),
    }),
  ),
  getStartedProgress: style(
    component({
      display: 'none',
      '@media': {
        '(width >= 48rem)': { display: 'block' },
      },
    }),
  ),
  // Pulses until the user has an organization to land in.
  trigger: recipe({
    base: component({ cursor: 'pointer' }),
    variants: {
      pulsing: {
        true: component({ animation: animate.pulse }),
      },
    },
  }),
  leaveEmphasis: style([shared.weight.semibold, shared.fg.strong]),
};
