import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';

export const loadingApiStyles = {
  bar: style(
    utility({
      position: 'fixed',
      height: space(1.5),
      width: '50%',
      willChange: 'transform',
    }),
  ),
};
