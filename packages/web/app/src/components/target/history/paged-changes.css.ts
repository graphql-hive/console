import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../styles/layered';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

export const pagedChangesStyles = {
  // The page dims while the next one loads.
  page: recipe({
    base: utility({
      transitionProperty: 'opacity',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: vars.transition.duration,
    }),
    variants: {
      loading: {
        true: utility({ opacity: '50%' }),
      },
    },
  }),
  error: style([shared.text.xs, shared.fg.critical]),
  count: style([shared.weight.normal, shared.fg.muted]),
  groupCount: style([shared.text.xs, shared.fg.muted]),
};
