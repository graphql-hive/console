import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

export const alertActivityChartStyles = {
  empty: style([
    shared.row.base,
    utility({
      height: '200px',
      justifyContent: 'center',
      borderRadius: vars.radius.md,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
      backgroundColor: vars.color.surface.card,
    }),
  ]),
  emptyText: style([shared.text.sm, shared.fg.subtle, utility({ fontStyle: 'italic' })]),
};
