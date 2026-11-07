import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import * as shared from '../styles/shared.css';
import { vars } from '../styles/theme.css';

export const targetAlertsCreateStyles = {
  limit: style([
    shared.stack.gap3,
    shared.textCenter,
    utility({
      minHeight: '400px',
      alignItems: 'center',
      justifyContent: 'center',
      paddingInline: space(6),
    }),
  ]),
  limitIcon: style(utility({ ...square(10), color: vars.color.fg.muted })),
  limitTitle: style([
    shared.text.base,
    shared.weight.medium,
    shared.fg.strong,
    utility({ margin: '0px' }),
  ]),
  limitText: style([
    shared.text.sm,
    shared.fg.secondary,
    utility({ margin: '0px', maxWidth: vars.container.md }),
  ]),
};
