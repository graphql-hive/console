import { style, styleVariants } from '@vanilla-extract/css';
import { component } from '../../../../../styles/layered';
import { space } from '../../../../../styles/space';
import { palette, vars } from '../../../../../styles/theme.css';

export const tooltipStyles = {
  // z-index goes here, not on the popup: the positioner is transformed for placement, which makes
  // it a stacking context that would trap a z-index set inside it.
  positioner: style(
    component({
      zIndex: '50',
      outlineStyle: 'none',
    }),
  ),
  popup: style(
    component({
      borderRadius: vars.radius.md,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
      backgroundColor: vars.color.neutral[4],
      fontSize: vars.text.xs,
      lineHeight: vars.text.xsLineHeight,
      color: vars.color.fg.default,
      boxShadow: `0 4px 6px -1px color-mix(in srgb, hsl(${palette.neutral[1]}) 30%, transparent), 0 2px 4px -2px color-mix(in srgb, hsl(${palette.neutral[1]}) 30%, transparent)`,
      outlineStyle: 'none',
      '@supports': {
        '(color: color-mix(in lab, red, red))': {
          boxShadow: `0 4px 6px -1px color-mix(in oklab, ${vars.color.neutral[1]} 30%, transparent), 0 2px 4px -2px color-mix(in oklab, ${vars.color.neutral[1]} 30%, transparent)`,
        },
      },
    }),
  ),
  maxWidth: styleVariants({
    default: component({ maxWidth: space(64) }),
    md: component({ maxWidth: vars.container.sm }),
    lg: component({ maxWidth: vars.container.md }),
    screen: component({ maxWidth: '90vw' }),
  }),
  padding: styleVariants({
    default: component({
      paddingInline: space(2.5),
      paddingBlock: space(1.5),
    }),
    // For a paragraph rather than a label.
    lg: component({ padding: space(4) }),
  }),
  arrow: style(
    component({
      fill: vars.color.neutral[4],
      stroke: vars.color.neutral[5],
    }),
  ),
};
