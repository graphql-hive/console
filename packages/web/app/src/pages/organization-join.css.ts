import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import * as shared from '../styles/shared.css';
import { vars } from '../styles/theme.css';
import * as utilities from '../styles/utilities.css';

export const organizationJoinStyles = {
  pending: style(
    utility({
      marginTop: space(6),
      display: 'flex',
      justifyContent: 'center',
    }),
  ),
  background: style(utility({ minHeight: '100vh' })),
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
  container: style([
    utilities.container,
    utility({
      '@media': {
        '(width >= 48rem)': { width: '60%' },
        '(width >= 64rem)': { width: '50%' },
      },
    }),
  ]),
  card: style(utility({ backgroundColor: vars.color.surface.inset })),
  cardActions: style([shared.row.base, utility({ marginTop: space(6) })]),
  description: style(
    utility({
      marginTop: space(2),
      color: vars.color.fg.secondary,
    }),
  ),
  choices: style([
    shared.stack.base,
    utility({
      marginTop: space(6),
      rowGap: space(4),
      '@media': {
        '(width >= 48rem)': {
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          columnGap: space(4),
          rowGap: '0px',
        },
      },
    }),
  ]),
};
