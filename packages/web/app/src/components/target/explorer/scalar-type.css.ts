import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

export const scalarTypeStyles = {
  root: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: space(4),
    }),
  ),
  body: style([shared.grow, shared.text.sm, utility({ maxWidth: vars.container['2xl'] })]),
};
