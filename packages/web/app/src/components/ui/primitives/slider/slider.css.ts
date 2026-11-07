import { style } from '@vanilla-extract/css';
import { layered } from '../../../../styles/layered';
import { space, square } from '../../../../styles/space';
import * as shared from '../../../../styles/shared.css';
import { vars } from '../../../../styles/theme.css';
import { focusRing } from '../shared-styles.css';

const s = layered.components;

export const sliderStyles = {
  root: style([
    shared.row.base,
    shared.fullWidth,
    s({
      touchAction: 'none',
      selectors: { '&[data-disabled]': { pointerEvents: 'none', opacity: 0.5 } },
    }),
  ]),
  /** Padded above and below, so the hit area is taller than the 4px track. */
  control: style([
    shared.row.base,
    shared.fullWidth,
    s({ cursor: 'pointer', paddingBlock: space(2) }),
  ]),
  track: style(
    s({
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
    s({ borderRadius: vars.radius.full, backgroundColor: vars.color.accent.DEFAULT }),
  ),
  thumb: style([
    focusRing,
    s({
      ...square(4),
      borderRadius: vars.radius.full,
      backgroundColor: vars.color.neutral[12],
      boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
    }),
  ]),
};
