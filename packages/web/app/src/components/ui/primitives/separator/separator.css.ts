import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import { vars } from '../../../../styles/theme.css';

export const separatorStyles = {
  root: recipe({
    base: component({ flexShrink: 0, backgroundColor: vars.color.line.DEFAULT }),
    variants: {
      orientation: {
        horizontal: component({ height: 1, width: '100%' }),
        vertical: component({ width: 1 }),
      },
      stretch: {
        true: {},
        false: {},
      },
    },
    compoundVariants: [
      // A vertical rule is a control's height unless asked to fill the row.
      {
        variants: { orientation: 'vertical', stretch: false },
        style: component({ height: space(8) }),
      },
      {
        variants: { orientation: 'vertical', stretch: true },
        style: component({ alignSelf: 'stretch' }),
      },
    ],
    defaultVariants: { orientation: 'horizontal', stretch: false },
  }),
};
