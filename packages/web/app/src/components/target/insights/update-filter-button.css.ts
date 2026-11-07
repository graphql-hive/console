import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';

export const updateFilterButtonStyles = {
  actions: style(
    utility({
      display: 'flex',
      gap: space(2),
    }),
  ),
};
