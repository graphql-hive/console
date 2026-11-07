import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';

export const withHeaderStyles = {
  brand: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(4),
    }),
  ),
  logo: style(utility(square(8))),
};
