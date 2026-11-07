import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space } from '../styles/space';
import * as shared from '../styles/shared.css';

export const organizationSubscriptionStyles = {
  root: style(
    utility({
      display: 'flex',
      flexDirection: 'column',
      rowGap: space(10),
    }),
  ),
  header: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBlock: space(6),
    }),
  ),
  section: style(utility({ marginTop: space(8) })),
  sectionNote: style([shared.text.sm, shared.fg.secondary]),
  sectionBody: style(utility({ marginTop: space(4) })),
};
