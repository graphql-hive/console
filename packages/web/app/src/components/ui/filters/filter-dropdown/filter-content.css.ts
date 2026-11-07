import { globalStyle, style } from '@vanilla-extract/css';
import { component } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import * as shared from '../../../../styles/shared.css';

const list = style({});

// The virtualizer's rows carry their own offsets.
globalStyle(`${list} > div > div > div > *`, component({ marginTop: '0px !important' }));

export const filterContentStyles = {
  // Modest min-width so the popover does not collapse to a one or two character item.
  root: style(component({ minWidth: '120px' })),
  // A zero-height row carrying every name so the popup is as wide as its widest item from the
  // start; laid out like an item row: checkbox, gap, name, chevron.
  widthProbe: style(
    component({
      visibility: 'hidden',
      display: 'flex',
      height: '0px',
      gap: space(2.5),
      overflow: 'hidden',
      paddingInline: space(2),
    }),
  ),
  probeCheckbox: style([shared.icon.sm, shared.noShrink]),
  probeNames: style(component({ whiteSpace: 'pre' })),
  probeChevron: style([shared.icon.sm, shared.noShrink, component({ marginLeft: 'auto' })]),
  note: style([
    shared.text.xs,
    shared.fg.default,
    component({
      marginTop: space(2),
      paddingInline: space(4),
      paddingBlock: space(1),
    }),
  ]),
  list,
};
