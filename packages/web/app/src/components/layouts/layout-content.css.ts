import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';
import { palette } from '../../styles/theme.css';
import * as utilities from '../../styles/utilities.css';

export const layoutContentStyles = {
  root: style([
    utilities.container,
    utility({
      minHeight: palette.layout.contentHeight,
      paddingBottom: space(7),
    }),
  ]),
};
