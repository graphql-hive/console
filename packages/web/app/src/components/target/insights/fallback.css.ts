import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../styles/layered';
import { square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const overlay = style([
  shared.row.base,
  utility({
    position: 'absolute',
    inset: '0px',
    justifyContent: 'center',
  }),
]);

export const fallbackStyles = {
  // The content fades while loading and blurs behind an empty or error overlay.
  content: recipe({
    variants: {
      blurred: {
        true: utility({ filter: `blur(${vars.blur.sm})` }),
      },
      dimmed: {
        true: utility({ opacity: '30%' }),
        false: utility({ opacity: '100%' }),
      },
    },
  }),
  overlay,
  alert: style(utility({ maxWidth: '500px' })),
  alertIcon: style(utility(square(4))),
};
