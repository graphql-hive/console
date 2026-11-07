import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

export const dataTableStyles = {
  root: style([shared.relative, shared.fullWidth, component({ overflow: 'auto' })]),
  table: style([shared.fullWidth, shared.text.sm]),
  sortButton: style([
    shared.inlineRow.gap1,
    shared.text.xs,
    shared.weight.medium,
    shared.fg.secondary,
    component({
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { color: vars.color.fg.DEFAULT },
          },
        },
      },
    }),
  ]),
  sortSpinner: style([shared.inlineFlex, shared.fg.success]),
  // Faint until the column is sorted; points up for ascending.
  sortArrow: recipe({
    base: component({
      ...square(3),
      transitionProperty: 'transform, translate, scale, rotate',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: vars.transition.duration,
    }),
    variants: {
      sorted: {
        true: component({ color: vars.color.success.DEFAULT }),
        false: component({ opacity: '30%' }),
      },
      ascending: {
        true: component({ rotate: '180deg' }),
      },
    },
  }),
  sortPriority: style([shared.text['2xs'], shared.fg.success, shared.tabularNums]),
  headerHint: style([shared.inlineFlex, shared.fg.muted]),
  headerHintIcon: style(component(square(3.5))),
  // Fills the column up to a cap without widening it; inline, so the column's alignment places it.
  loadingCell: recipe({
    base: [shared.inlineFlex, shared.fullWidth],
    variants: {
      column: {
        first: component({ maxWidth: space(48) }),
        other: component({ maxWidth: space(24) }),
      },
    },
  }),
  expandChevron: recipe({
    base: component({
      ...square(4),
      transitionProperty: 'transform, translate, scale, rotate',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: vars.transition.duration,
    }),
    variants: {
      expanded: {
        true: component({ rotate: '180deg' }),
      },
    },
  }),
  linkChevron: style(component(square(4))),
};
