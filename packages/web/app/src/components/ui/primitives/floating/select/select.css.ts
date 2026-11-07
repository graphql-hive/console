import { style, styleVariants } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../../../styles/layered';
import { space, square } from '../../../../../styles/space';
import * as shared from '../../../../../styles/shared.css';

export const selectStyles = {
  width: styleVariants({
    auto: component({ display: 'inline-block' }),
    sm: component({ display: 'inline-block', width: '150px' }),
    md: component({ display: 'inline-block', width: '200px' }),
    lg: component({ display: 'inline-block', width: '250px' }),
    full: component({ display: 'block', width: '100%' }),
  }),
  // z-index goes here, not on the popup: the positioner is transformed for placement, which makes
  // it a stacking context that would trap a z-index set inside it.
  positioner: style(
    component({
      zIndex: '50',
      outlineStyle: 'none',
    }),
  ),
  matchTriggerWidth: style(component({ width: 'var(--anchor-width)' })),
  list: style(component({ maxHeight: space(64) })),
  // Room on the left for the check; an item with a description grows past the row height.
  item: recipe({
    base: component({
      position: 'relative',
      paddingLeft: space(7),
    }),
    variants: {
      described: {
        true: component({
          height: 'auto',
          paddingBlock: space(1.5),
        }),
      },
    },
  }),
  indicator: style(
    component({
      position: 'absolute',
      top: space(2),
      left: space(2),
      display: 'inline-flex',
      alignItems: 'center',
    }),
  ),
  indicatorIcon: style(component(square(3))),
  description: style([
    shared.truncate,
    shared.text.xs,
    shared.fg.muted,
    component({ display: 'block' }),
  ]),
  trailing: style([
    shared.inlineRow.base,
    shared.noShrink,
    component({ marginLeft: 'auto', paddingLeft: space(2) }),
  ]),
  tooltipTrigger: style(component({ display: 'block' })),
};
