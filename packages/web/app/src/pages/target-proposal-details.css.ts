import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space } from '../styles/space';

export const targetProposalDetailsStyles = {
  changes: style(
    utility({
      paddingInline: space(2),
      paddingBottom: space(8),
    }),
  ),
  empty: style(utility({ paddingInline: space(4) })),
};
