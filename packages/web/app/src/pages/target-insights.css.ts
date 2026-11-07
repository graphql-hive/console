import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space } from '../styles/space';
import * as shared from '../styles/shared.css';

export const targetInsightsStyles = {
  root: style(utility({ paddingBlock: space(6) })),
  toolbar: style([shared.row.between, utility({ marginTop: space(4) })]),
  toolbarActions: style([shared.row.base, utility({ columnGap: space(2) })]),
  pending: style(utility({ paddingBlock: space(8) })),
};
