import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';

export const compositionErrorsPopoverStyles = {
  icon: style(utility(square(3))),
  text: style([shared.text.xs, shared.fg.default]),
  textSpaced: style([shared.text.xs, shared.fg.default, utility({ marginTop: space(2) })]),
};
