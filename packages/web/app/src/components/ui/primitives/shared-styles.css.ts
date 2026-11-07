import { style, styleVariants } from '@vanilla-extract/css';
import { component } from '../../../styles/layered';
import { space } from '../../../styles/space';
import { palette, vars } from '../../../styles/theme.css';
import * as utilities from '../../../styles/utilities.css';

// The resting fill and border of a control per surface it sits on; `onSurface` below adds the
// hover half. See `./shared-styles.ts` for what each entry means.
const surface = styleVariants({
  base: component({
    borderColor: vars.color.line.control,
    backgroundColor: vars.color.surface.control,
  }),
  raised: component({
    borderColor: vars.color.line.DEFAULT,
    backgroundColor: vars.color.surface.controlRaised,
    selectors: {
      '&:where(.dark, .dark *)': { borderColor: vars.color.line.strong },
    },
  }),
});

export const controlStyles = {
  segmentSeparator: style(
    component({
      borderLeftStyle: 'solid',
      borderLeftWidth: '1px',
      borderLeftColor: 'inherit',
    }),
  ),
  segmentButton: style(
    component({
      cursor: 'pointer',
      paddingInline: space(2.5),
      paddingBlock: space(1.5),
      fontSize: vars.text.control,
      lineHeight: vars.text.controlLineHeight,
      transitionProperty:
        'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: vars.transition.duration,
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': {
              backgroundColor: `color-mix(in srgb, hsl(${palette.neutral[4]}) 50%, transparent)`,
              color: vars.color.fg.DEFAULT,
            },
          },
          '@supports': {
            '(color: color-mix(in lab, red, red))': {
              selectors: {
                '&:hover': {
                  backgroundColor: `color-mix(in oklab, ${vars.color.neutral[4]} 50%, transparent)`,
                },
              },
            },
          },
        },
      },
    }),
  ),
  focusRing: style(
    component({
      selectors: {
        '&:focus-visible': {
          outlineStyle: 'solid',
          outlineWidth: '2px',
          outlineOffset: '2px',
          outlineColor: vars.color.accent.DEFAULT,
        },
      },
    }),
  ),
  focusRingQuiet: style(
    component({
      selectors: {
        '&:focus-visible': {
          outlineWidth: '1px',
          outlineColor: vars.color.accent.DEFAULT,
          outlineStyle: 'dotted',
        },
      },
    }),
  ),
  scrollArea: style([utilities.thinScrollbar, component({ overflowY: 'auto' })]),
  surface,
  onSurface: styleVariants({
    base: [
      surface.base,
      component({
        '@media': {
          '(hover: hover)': {
            selectors: {
              '&:hover': { backgroundColor: vars.color.neutral[1] },
              '&:where(.dark, .dark *):hover': {
                borderColor: vars.color.line.DEFAULT,
                backgroundColor: vars.color.neutral[4],
              },
            },
          },
        },
      }),
    ],
    raised: [
      surface.raised,
      component({
        '@media': {
          '(hover: hover)': {
            selectors: {
              '&:hover': { borderColor: vars.color.line.strong },
              '&:where(.dark, .dark *):hover': {
                borderColor: vars.color.neutral[7],
                backgroundColor: vars.color.neutral[6],
              },
            },
          },
        },
      }),
    ],
  }),
  size: styleVariants({
    compact: component({
      height: space(7.5),
      fontSize: vars.text.control,
      lineHeight: vars.text.controlLineHeight,
    }),
    default: component({
      height: space(9),
      fontSize: vars.text.sm,
      lineHeight: vars.text.smLineHeight,
    }),
  }),
};
