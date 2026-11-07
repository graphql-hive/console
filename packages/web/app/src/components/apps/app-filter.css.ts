import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';

export const appFilterStyles = {
  root: style(
    utility({
      minWidth: '200px',
      flexGrow: '1',
    }),
  ),
};
