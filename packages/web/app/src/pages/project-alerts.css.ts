import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space } from '../styles/space';
import * as shared from '../styles/shared.css';

export const projectAlertsStyles = {
  description: style(utility({ paddingBottom: space(2) })),
  actions: style([shared.row.base, utility({ marginTop: space(4), columnGap: space(2) })]),
  content: style(utility({ paddingBlock: space(6) })),
  sections: style([shared.stack.base, utility({ rowGap: space(4) })]),
  root: style(
    utility({
      display: 'flex',
      flexDirection: 'column',
      rowGap: space(10),
    }),
  ),
};
