import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

export const availabilityBarStyles = {
  root: style([
    shared.relative,
    shared.row.base,
    shared.fullWidth,
    utility({
      height: space(2),
      overflow: 'hidden',
      borderRadius: vars.radius.sm,
      backgroundColor: vars.color.critical.DEFAULT,
    }),
  ]),
  // A hairline separates the fill from the remainder unless it covers the whole bar.
  fill: recipe({
    base: utility({
      height: '100%',
      backgroundColor: vars.color.success.DEFAULT,
      transitionProperty: 'all',
      transitionDuration: '300ms',
      transitionTimingFunction: vars.ease.inOut,
    }),
    variants: {
      partial: {
        true: utility({
          borderRightStyle: 'solid',
          borderRightWidth: '1px',
        }),
      },
    },
  }),
};
