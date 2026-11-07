import { style } from '@vanilla-extract/css';
import { component } from '../../styles/layered';
import { space } from '../../styles/space';
import * as shared from '../../styles/shared.css';
import { vars } from '../../styles/theme.css';

export const codeStyles = {
  root: style([
    shared.relative,
    shared.row.gap2,
    shared.mono,
    shared.text.sm,
    shared.breakAll,
    component({
      cursor: 'text',
      borderRadius: vars.radius.md,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.line.strong,
      backgroundColor: vars.color.surface.inset,
      padding: space(4),
      paddingRight: space(14),
    }),
  ]),
  code: style(component({ whiteSpace: 'pre-line' })),
  // Revealed while the block is hovered or just copied.
  copyButton: style(
    component({
      position: 'absolute',
      top: space(2),
      right: space(3),
      cursor: 'pointer',
      borderRadius: vars.radius.md,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.line.strong,
      padding: space(2),
      opacity: '0%',
      selectors: {
        '&[data-hovering="true"]': {
          opacity: '100%',
          transitionProperty: 'opacity',
          transitionTimingFunction: vars.transition.timing,
          transitionDuration: vars.transition.duration,
        },
      },
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { color: vars.color.warning.DEFAULT },
          },
        },
      },
    }),
  ),
};
