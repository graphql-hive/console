import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';
import * as shared from '../../styles/shared.css';
import { vars } from '../../styles/theme.css';

export const policyConfigBoxStyles = {
  // Without a title the box lays its children out in a row.
  root: recipe({
    base: utility({
      alignItems: 'center',
      paddingInline: space(4),
      paddingBottom: space(2),
      fontFamily: vars.font.mono,
    }),
    variants: {
      untitled: {
        true: utility({ display: 'flex' }),
      },
    },
  }),
  title: style([shared.text.xs, shared.fg.subtle, utility({ paddingBottom: space(1) })]),
};
