import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

export const connectLabModalStyles = {
  heading: style([shared.text.sm, shared.fg.strong]),
  callout: style(utility({ marginTop: space(2) })),
  emphasis: style([shared.text.sm, shared.fg.strong]),
  code: style([
    shared.inlineRow.base,
    shared.text.sm,
    shared.fg.default,
    utility({
      columnGap: space(1),
      borderRadius: vars.radius.sm,
      backgroundColor: vars.color.surface.code,
      padding: space(2),
    }),
  ]),
  link: style(
    utility({
      textDecorationLine: 'underline',
      textUnderlineOffset: '2px',
    }),
  ),
  note: style([shared.text.sm, shared.fg.secondary]),
};
