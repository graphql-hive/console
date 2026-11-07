import { style, styleVariants } from '@vanilla-extract/css';
import { component } from '../../../../../styles/layered';
import { space, square } from '../../../../../styles/space';
import * as shared from '../../../../../styles/shared.css';
import { vars } from '../../../../../styles/theme.css';

// Plain so the arrow's graphic can turn with the side the arrow element reports.
const arrow = style(
  component({
    selectors: {
      '&[data-side="bottom"]': { bottom: 'calc(100% - 2px)' },
      '&[data-side="top"]': { top: 'calc(100% - 2px)' },
      '&[data-side="left"]': { left: 'calc(100% - 8px)' },
      '&[data-side="right"]': { right: 'calc(100% - 8px)' },
    },
  }),
);

export const popoverStyles = {
  width: styleVariants({
    sm: component({ width: space(72) }),
    md: component({ width: space(80) }),
    lg: component({ width: '28rem' }),
    xl: component({ width: '34rem' }),
  }),
  // A structured popover: title row, optional description, then the content.
  structured: style(component({ padding: space(4) })),
  header: style([shared.row.between, component({ marginBottom: space(3) })]),
  title: style([shared.text.sm, shared.fg.strong]),
  close: style(
    component({
      borderRadius: vars.radius.sm,
      padding: space(0.5),
      color: vars.color.fg.secondary,
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { color: vars.color.fg.DEFAULT },
          },
        },
      },
    }),
  ),
  closeIcon: style(component(square(4))),
  description: style([shared.text.sm, shared.fg.default, component({ marginBottom: space(3) })]),
  padded: style(component({ padding: space(4) })),
  // z-index goes here, not on the popup: the positioner is transformed for placement, which makes
  // it a stacking context that would trap a z-index set inside it.
  positioner: style(
    component({
      zIndex: '50',
      outlineStyle: 'none',
    }),
  ),
  arrow,
  arrowGraphic: style(
    component({
      display: 'block',
      selectors: {
        [`${arrow}[data-side="top"] &`]: { rotate: '180deg' },
        [`${arrow}[data-side="left"] &`]: { rotate: '90deg' },
        [`${arrow}[data-side="right"] &`]: { rotate: '-90deg' },
      },
    }),
  ),
  arrowFill: style(component({ fill: vars.color.surface.floating })),
  arrowStroke: style(component({ fill: vars.color.line.DEFAULT })),
};
