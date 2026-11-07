import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import { vars } from '../../../../styles/theme.css';

export const oidcRegisteredDomainSheetStyles = {
  domainName: style(
    utility({
      marginLeft: space(3),
      fontFamily: vars.font.mono,
    }),
  ),
  footerActions: style(
    utility({
      marginLeft: 'auto',
      display: 'flex',
      gap: space(2),
    }),
  ),
  footerClose: style(utility({ marginLeft: 'auto' })),
  steps: style(utility({ paddingBottom: space(4) })),
  // The DNS record is shown faded until the challenge has been issued.
  challenge: recipe({
    variants: {
      pending: {
        true: utility({
          pointerEvents: 'none',
          opacity: '33%',
        }),
      },
    },
  }),
  challengeError: style(
    utility({
      marginTop: space(4),
      color: vars.color.critical.DEFAULT,
    }),
  ),
};
