import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import { animate } from '../../../styles/animations.css';
import * as shared from '../../../styles/shared.css';

export const legacyCompositionStyles = {
  root: style([
    shared.stack.base,
    utility({
      alignItems: 'flex-start',
      rowGap: space(6),
    }),
  ]),
  description: style([shared.text.sm, shared.fg.secondary]),
  actions: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: space(2),
    }),
  ),
  spinner: style(utility({ marginRight: space(2), ...square(4), animation: animate.spin })),
};
