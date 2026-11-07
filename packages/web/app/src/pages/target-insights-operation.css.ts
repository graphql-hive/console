import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';

export const targetInsightsOperationStyles = {
  body: style(utility({ paddingTop: space(6) })),
  copyIcon: style(utility(square(3.5))),
  header: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBlock: space(6),
    }),
  ),
  headerActions: style(
    utility({
      display: 'flex',
      justifyContent: 'flex-end',
      columnGap: space(2),
    }),
  ),
  alertIcon: style(utility(square(4))),
  stats: style(
    utility({
      marginTop: space(12),
      width: '100%',
    }),
  ),
  pending: style(utility({ paddingBlock: space(8) })),
};
