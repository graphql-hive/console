import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import * as shared from '../styles/shared.css';

export const organizationNewStyles = {
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
};
