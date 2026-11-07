import { style } from '@vanilla-extract/css';
import { component } from '../../../../styles/layered';
import { space, square } from '../../../../styles/space';
import { focusRing } from '../shared-styles';
import * as shared from '../../../../styles/shared.css';
import { vars } from '../../../../styles/theme.css';

export const sliderStyles = {
  root: style([
    shared.row.base,
    shared.fullWidth,
    component({
      touchAction: 'none',
      selectors: { '&[data-disabled]': { pointerEvents: 'none', opacity: 0.5 } },
    }),
  ]),
  /** Padded above and below, so the hit area is taller than the 4px track. */
  control: style([
    shared.row.base,
    shared.fullWidth,
    component({ cursor: 'pointer', paddingBlock: space(2) }),
  ]),
  track: style(
    component({
      position: 'relative',
      height: space(1),
      width: '100%',
      borderRadius: vars.radius.full,
      backgroundColor: vars.color.neutral[5],
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }),
  ),
  indicator: style(
    component({ borderRadius: vars.radius.full, backgroundColor: vars.color.accent.DEFAULT }),
  ),
  thumb: style([
    focusRing,
    component({
      ...square(4),
      borderRadius: vars.radius.full,
      backgroundColor: vars.color.neutral[12],
      boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
    }),
  ]),
};
