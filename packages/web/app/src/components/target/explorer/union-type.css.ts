import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { vars } from '../../../styles/theme.css';

export const unionTypeStyles = {
  member: style(
    utility({
      fontWeight: vars.weight.semibold,
      color: vars.color.fg.default,
    }),
  ),
};
