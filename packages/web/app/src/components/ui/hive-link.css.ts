import { style } from '@vanilla-extract/css';
import { component } from '../../styles/layered';

export const hiveLinkStyles = {
  root: style(
    component({
      display: 'inline-flex',
      alignItems: 'center',
    }),
  ),
};
