import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import * as shared from '../styles/shared.css';
import { vars } from '../styles/theme.css';

export const organizationOidcRequestStyles = {
  root: style(utility({ marginBlock: space(6) })),
  body: style([
    shared.stack.base,
    utility({
      minHeight: space(140),
      alignItems: 'center',
      justifyContent: 'center',
      rowGap: space(6),
    }),
  ]),
  icon: style(utility({ ...square(20), stroke: vars.color.warning.DEFAULT })),
  text: style([shared.stack.base, shared.textCenter, utility({ rowGap: space(2) })]),
  hint: style([shared.textCenter, shared.text.sm, shared.weight.medium, shared.fg.secondary]),
};
