import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';

export const explorerHeaderStyles = {
  root: style(utility({ paddingBlock: space(6) })),
  row: style(
    utility({
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: space(4),
    }),
  ),
};
