import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { layered } from '../../../../styles/layered';
import * as shared from '../../../../styles/shared.css';
import { vars } from '../../../../styles/theme.css';

const s = layered.components;

export const labelStyles = {
  root: recipe({
    variants: {
      variant: {
        /** Small caps above a control. */
        caps: [
          shared.weight.medium,
          shared.fg.secondary,
          s({ display: 'block', fontSize: 9, letterSpacing: '0.75px', textTransform: 'uppercase' }),
        ],
        /** Beside a control, in running text. */
        inline: [
          shared.text.xs,
          shared.weight.normal,
          shared.fg.default,
          s({ display: 'inline-block' }),
        ],
      },
    },
    defaultVariants: { variant: 'caps' },
  }),
  /** The tooltip trigger beside the label. */
  hint: style([
    shared.inlineFlex,
    shared.fg.muted,
    s({
      '@media': {
        '(hover: hover)': {
          selectors: { '&:hover': { color: vars.color.fg.default } },
        },
      },
    }),
  ]),
  hintIcon: shared.icon.xs,
};
