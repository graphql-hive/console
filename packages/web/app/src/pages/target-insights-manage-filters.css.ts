import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space } from '../styles/space';
import * as shared from '../styles/shared.css';

export const targetInsightsManageFiltersStyles = {
  visibility: style([shared.inlineRow.base, utility({ gap: space(3) })]),
  filterDetails: style(
    utility({
      paddingInline: space(10),
      paddingBlock: space(4),
    }),
  ),
  filterError: style([shared.text.xs, shared.fg.critical]),
  filterActions: style(
    utility({
      marginTop: space(3),
      display: 'flex',
      gap: space(2),
    }),
  ),
  content: style(utility({ paddingBlock: space(8) })),
  stats: style(
    utility({
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: space(4),
    }),
  ),
  table: style(utility({ marginTop: space(8) })),
  statSkeleton: style([shared.row.base, utility({ height: space(8) })]),
  root: style(
    utility({
      paddingTop: space(6),
      paddingBottom: space(3),
    }),
  ),
};
