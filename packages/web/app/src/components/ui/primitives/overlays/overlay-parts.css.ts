import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import * as shared from '../../../../styles/shared.css';
import { palette, vars } from '../../../../styles/theme.css';

export const overlayPartsStyles = {
  // Base UI sets `data-starting-style` on the frame a popup mounts and `data-ending-style` while
  // it leaves, so one opacity transition covers both directions.
  backdrop: style(
    component({
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      backgroundColor: `color-mix(in srgb, hsl(${palette.neutral[1]}) 1%, transparent)`,
      backdropFilter: `blur(${vars.blur.sm})`,
      WebkitBackdropFilter: `blur(${vars.blur.sm})`,
      transitionProperty: 'opacity',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: '200ms',
      selectors: { '&[data-starting-style], &[data-ending-style]': { opacity: 0 } },
      '@supports': {
        '(color: color-mix(in lab, red, red))': {
          backgroundColor: `color-mix(in oklab, ${vars.color.neutral[1]} 1%, transparent)`,
        },
      },
    }),
  ),
  surface: style(
    component({
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      gap: space(4),
      borderStyle: 'solid',
      borderWidth: 1,
      borderColor: vars.color.line.DEFAULT,
      backgroundColor: vars.color.surface.overlay,
      color: vars.color.fg.DEFAULT,
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      outlineStyle: 'none',
    }),
  ),
  portalMount: style(component({ position: 'absolute', insetInline: 0, top: 0, height: 0 })),
  header: recipe({
    base: [
      shared.stack.base,
      shared.noShrink,
      component({ gap: space(1.5), paddingInline: space(6), paddingTop: space(6) }),
    ],
    variants: {
      /** Leaves room on the right for the close button. */
      clearCloseButton: {
        true: component({ paddingRight: space(14) }),
      },
    },
  }),
  title: style(
    component({
      marginBottom: space(2),
      fontSize: vars.text.lg,
      lineHeight: 1,
      fontWeight: vars.weight.normal,
      color: vars.color.fg.DEFAULT,
    }),
  ),
  description: style([shared.text.sm, shared.fg.default]),
  /** The body of content that lays itself out and owns its scrolling: the remaining height, no inset. */
  bodyFill: style([shared.stack.base, shared.grow, component({ minHeight: 0 })]),
  body: recipe({
    base: component({ paddingInline: space(6) }),
    variants: {
      /** When nothing follows the body, it carries the bottom inset itself. */
      padBottom: {
        true: component({ paddingBottom: space(6) }),
      },
    },
  }),
  footer: style([
    shared.flex,
    shared.noShrink,
    component({
      flexDirection: 'column-reverse',
      gap: space(2),
      paddingInline: space(6),
      paddingBottom: space(6),
      '@media': {
        '(width >= 40rem)': { flexDirection: 'row', justifyContent: 'flex-end' },
      },
    }),
  ]),
  closeButton: style(component({ position: 'absolute', top: space(4), right: space(4) })),
};
