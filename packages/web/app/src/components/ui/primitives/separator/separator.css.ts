import { recipe } from '@vanilla-extract/recipes';
import { layered } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import { vars } from '../../../../styles/theme.css';

const s = layered.components;

export const separatorStyles = {
  root: recipe({
    base: s({ flexShrink: 0, backgroundColor: vars.color.line.DEFAULT }),
    variants: {
      orientation: {
        horizontal: s({ height: 1, width: '100%' }),
        vertical: s({ width: 1 }),
      },
      stretch: {
        true: {},
        false: {},
      },
    },
    compoundVariants: [
      // A vertical rule is a control's height unless asked to fill the row.
      { variants: { orientation: 'vertical', stretch: false }, style: s({ height: space(8) }) },
      { variants: { orientation: 'vertical', stretch: true }, style: s({ alignSelf: 'stretch' }) },
    ],
    defaultVariants: { orientation: 'horizontal', stretch: false },
  }),
};
