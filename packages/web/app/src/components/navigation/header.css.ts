import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { palette, vars } from '../../styles/theme.css';
import * as utilities from '../../styles/utilities.css';

export const headerStyles = {
  root: style(
    utility({
      height: palette.layout.headerHeight,
      backgroundColor: vars.color.surface.card,
    }),
  ),
  bar: style([
    utilities.container,
    utility({
      display: 'flex',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'space-between',
    }),
  ]),
};
