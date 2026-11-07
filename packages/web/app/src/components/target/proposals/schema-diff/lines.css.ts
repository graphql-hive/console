import { style } from '@vanilla-extract/css';
import { utility } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import * as shared from '../../../../styles/shared.css';
import { vars } from '../../../../styles/theme.css';

export const linesStyles = {
  line: style([
    shared.fullWidth,
    shared.fg.strong,
    utility({
      marginBottom: space(3),
      display: 'block',
      backgroundColor: vars.color.surface.code,
      padding: space(3),
      paddingLeft: space(6),
    }),
  ]),
};
