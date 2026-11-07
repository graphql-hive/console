import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';

export const serviceFilterButtonStyles = {
  root: style(
    utility({
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { textDecorationLine: 'underline' },
          },
        },
      },
    }),
  ),
};
