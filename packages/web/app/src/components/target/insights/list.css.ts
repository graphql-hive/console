import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

export const listStyles = {
  warningIcon: style(utility({ ...square(3.5), color: vars.color.warning.DEFAULT })),
  warningText: style([shared.text.sm, shared.fg.default]),
  pagination: style(utility({ marginTop: space(12) })),
};
