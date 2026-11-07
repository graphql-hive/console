import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

export const stringConfigStyles = {
  hint: style(
    utility({
      marginLeft: space(2),
      color: vars.color.accent.DEFAULT,
    }),
  ),
  hintIcon: style(utility(square(4))),
  hintText: style([shared.text.sm, shared.fg.default]),
};
