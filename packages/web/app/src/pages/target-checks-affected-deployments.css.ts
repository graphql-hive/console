import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space } from '../styles/space';
import * as shared from '../styles/shared.css';
import { vars } from '../styles/theme.css';

export const targetChecksAffectedDeploymentsStyles = {
  content: style([
    shared.stack.base,
    shared.fill,
    utility({ height: '100%', paddingBlock: space(6) }),
  ]),
  checkLink: style(
    utility({
      color: vars.color.warning.DEFAULT,
      '@media': {
        '(hover: hover)': {
          selectors: { '&:hover': { textDecorationLine: 'underline' } },
        },
      },
    }),
  ),
  separator: style(
    utility({
      marginInline: space(2),
      color: vars.color.fg.secondary,
    }),
  ),
  code: style([
    shared.mono,
    shared.fg.warning,
    utility({
      borderRadius: vars.radius.sm,
      backgroundColor: vars.color.surface.code,
      paddingInline: space(1),
      paddingBlock: space(0.5),
    }),
  ]),
  table: style(utility({ marginTop: space(4) })),
  root: style(utility({ minHeight: vars.minH.content })),
};
