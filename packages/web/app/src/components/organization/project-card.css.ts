import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';

export const projectCardStyles = {
  link: style(
    utility({
      display: 'block',
      paddingTop: space(4),
      paddingBottom: space(5),
    }),
  ),
};
