import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';

export const usageStyles = {
  root: style(
    utility({
      top: space(7),
      right: space(4),
    }),
  ),
};
