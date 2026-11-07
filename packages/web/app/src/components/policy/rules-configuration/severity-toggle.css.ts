import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../styles/layered';
import { square } from '../../../styles/space';
import { vars } from '../../../styles/theme.css';

const hover = (color: string) => ({
  '@media': {
    '(hover: hover)': {
      selectors: { '&:hover': { color } },
    },
  },
});

// A severity option's icon: in its colour when active or hovered, subtle otherwise.
export const severityToggleStyles = {
  icon: recipe({
    base: utility(square(4)),
    variants: {
      tone: {
        warning: utility(hover(vars.color.warning.DEFAULT)),
        critical: utility(hover(vars.color.critical.DEFAULT)),
        neutral: utility(hover(vars.color.fg.DEFAULT)),
      },
      active: {
        true: {},
        false: utility({ color: vars.color.fg.subtle }),
      },
    },
    compoundVariants: [
      {
        variants: { tone: 'warning', active: true },
        style: utility({ color: vars.color.warning.DEFAULT }),
      },
      {
        variants: { tone: 'critical', active: true },
        style: utility({ color: vars.color.critical.DEFAULT }),
      },
      {
        variants: { tone: 'neutral', active: true },
        style: utility({ color: vars.color.fg.DEFAULT }),
      },
    ],
  }),
  box: style(
    utility({
      gridRowStart: '1',
      gridRowEnd: '6',
      selectors: {
        '&:first-child': { paddingLeft: '0px' },
      },
    }),
  ),
};
