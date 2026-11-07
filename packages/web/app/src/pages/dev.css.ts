import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { square } from '../styles/space';

export const devStyles = {
  root: style(
    utility({
      height: '100vh',
      width: '100%',
    }),
  ),
  logo: style(utility(square(6))),
};
