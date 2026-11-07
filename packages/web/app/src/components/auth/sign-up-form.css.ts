import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';

export const signUpFormStyles = {
  nameFields: style(
    utility({
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: space(4),
    }),
  ),
};
