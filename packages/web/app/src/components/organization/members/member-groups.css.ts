import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';

export const memberGroupsStyles = {
  none: style([shared.row.gap1_5, utility({ width: 'fit-content' })]),
  row: style([shared.row.gap2, utility({ width: 'fit-content' })]),
  icon: style(utility(square(3.5))),
};
