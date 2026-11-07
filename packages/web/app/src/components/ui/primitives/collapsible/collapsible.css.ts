import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { layered } from '../../../../styles/layered';
import { space, square } from '../../../../styles/space';
import { focusRing } from '../shared-styles';
import * as shared from '../../../../styles/shared.css';
import { vars } from '../../../../styles/theme.css';

const s = layered.components;

// Plain styles for the root and the trigger, because the header's border and the chevron's turn
// select on their open state.
const column = style(s({ display: 'flex', minHeight: 0, flexDirection: 'column' }));

const trigger = style(
  s({
    display: 'flex',
    minWidth: 0,
    flexGrow: 1,
    alignItems: 'center',
    gap: space(2),
    textAlign: 'left',
    fontSize: vars.text.sm,
    lineHeight: vars.text.smLineHeight,
    fontWeight: vars.weight.medium,
    color: vars.color.fg.default,
    transitionProperty:
      'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
    transitionTimingFunction: vars.transition.timing,
    transitionDuration: vars.transition.duration,
    selectors: { '&[data-panel-open]': { color: vars.color.fg.DEFAULT } },
    '@media': {
      '(hover: hover)': {
        selectors: { '&:hover': { color: vars.color.fg.DEFAULT } },
      },
    },
  }),
);

export const collapsibleStyles = {
  root: column,
  panel: column,
  header: recipe({
    base: [shared.row.base],
    variants: {
      variant: {
        section: {},
        /** A titled panel's bar: a rule under it while the panel is open. */
        panel: s({
          borderColor: vars.color.line.DEFAULT,
          paddingRight: space(4),
          selectors: {
            [`${column}[data-open] &`]: { borderBottomStyle: 'solid', borderBottomWidth: 1 },
          },
        }),
      },
    },
  }),
  trigger: recipe({
    base: [trigger, focusRing],
    variants: {
      variant: {
        section: s({
          height: space(8),
          borderRadius: vars.radius.md,
          paddingInline: space(2),
          '@media': {
            '(hover: hover)': {
              selectors: { '&:hover': { backgroundColor: vars.color.neutral[5] } },
            },
          },
        }),
        panel: s({ paddingInline: space(4), paddingBlock: space(3) }),
      },
    },
  }),
  chevron: style(
    s({
      ...square(4),
      flexShrink: 0,
      color: vars.color.fg.secondary,
      transitionProperty: 'transform, translate, scale, rotate',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: vars.transition.duration,
      selectors: { [`${trigger}[data-panel-open] &`]: { rotate: '90deg' } },
    }),
  ),
  title: style([shared.shrinkable, shared.grow]),
};
