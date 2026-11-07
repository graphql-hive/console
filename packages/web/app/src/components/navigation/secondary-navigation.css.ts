import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { palette, vars } from '../../styles/theme.css';
import * as utilities from '../../styles/utilities.css';

export const secondaryNavigationStyles = {
  root: style(
    utility({
      position: 'relative',
      height: palette.layout.tabsNavbarHeight,
      borderBottomStyle: 'solid',
      borderBottomWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
      backgroundColor: vars.color.surface.card,
    }),
  ),
  container: utilities.container,
};
