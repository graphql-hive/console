import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';

export const planSummaryStyles = {
  root: style(
    utility({
      display: 'flex',
      gap: space(32),
    }),
  ),
  stat: style(utility({ marginBottom: space(8) })),
};
