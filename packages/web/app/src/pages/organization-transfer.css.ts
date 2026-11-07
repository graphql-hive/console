import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import { animate } from '../styles/animations.css';
import * as shared from '../styles/shared.css';
import { vars } from '../styles/theme.css';

export const organizationTransferStyles = {
  title: style(
    utility({
      marginBottom: space(4),
      fontSize: vars.text['3xl'],
      lineHeight: vars.text['3xlLineHeight'],
      fontWeight: vars.weight.medium,
      color: vars.color.fg.DEFAULT,
      '@media': {
        '(width >= 40rem)': {
          fontSize: vars.text['4xl'],
          lineHeight: vars.text['4xlLineHeight'],
        },
      },
    }),
  ),
  description: style(
    utility({
      marginBottom: space(8),
      lineHeight: vars.leading.relaxed,
    }),
  ),
  actions: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(2),
    }),
  ),
  background: style(utility({ minHeight: '100vh' })),
  root: style([shared.row.base, shared.grow, utility({ height: '100%' })]),
  signOut: style(
    utility({
      position: 'absolute',
      top: space(6),
      right: space(6),
    }),
  ),
  signOutIcon: style(utility({ marginRight: space(2), ...square(4) })),
  home: style(
    utility({
      position: 'absolute',
      top: space(6),
      left: space(6),
    }),
  ),
  logo: style(utility(square(10))),
  body: style([
    shared.flex,
    shared.fullWidth,
    utility({
      height: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    }),
  ]),
  content: style([
    shared.stack.base,
    shared.fullWidth,
    shared.textCenter,
    utility({
      '@media': {
        '(width >= 48rem)': { width: '66.666667%' },
      },
    }),
  ]),
  spinner: style(
    utility({ marginRight: space(2), display: 'inline', ...square(8), animation: animate.spin }),
  ),
};
