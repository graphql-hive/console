import { style } from '@vanilla-extract/css';
import { component } from '../../styles/layered';

export const timeAgoStyles = {
  root: style(
    component({
      cursor: 'default',
      whiteSpace: 'nowrap',
    }),
  ),
};
