import { style, styleVariants } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../../styles/layered';
import { space, square } from '../../../../styles/space';
import { focusRingQuiet } from '../shared-styles';
import * as shared from '../../../../styles/shared.css';
import { vars } from '../../../../styles/theme.css';

// Plain, because the chevron's turn selects on the trigger's open state.
const trigger = style(
  component({
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    gap: space(2),
    borderRadius: vars.radius.sm,
    textAlign: 'left',
    fontWeight: vars.weight.medium,
    transitionProperty:
      'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
    transitionTimingFunction: vars.transition.timing,
    transitionDuration: vars.transition.duration,
    selectors: {
      '&:focus-visible': { outlineOffset: -2 },
      '&[data-disabled]': { pointerEvents: 'none', opacity: 0.5 },
    },
  }),
);

export const accordionStyles = {
  root: recipe({
    variants: {
      variant: {
        list: {},
        boxed: component({ display: 'flex', flexDirection: 'column', gap: space(4) }),
        plain: {},
      },
    },
  }),
  item: recipe({
    variants: {
      variant: {
        list: component({
          borderBottomStyle: 'solid',
          borderBottomWidth: 1,
          borderColor: vars.color.line.DEFAULT,
        }),
        boxed: component({
          overflow: 'hidden',
          borderRadius: vars.radius.md,
          borderStyle: 'solid',
          borderWidth: 1,
          borderColor: vars.color.line.DEFAULT,
        }),
        plain: {},
      },
    },
  }),
  /** The row holding the heading and any action beside it. */
  headerRow: recipe({
    base: [shared.row.base],
    variants: {
      variant: {
        list: {},
        boxed: component({ paddingInline: space(4) }),
        plain: {},
      },
      /** A static row has no button, so no hover fill. */
      interactive: {
        true: {},
        false: {},
      },
    },
    compoundVariants: [
      {
        variants: { variant: 'boxed', interactive: true },
        style: component({
          transitionProperty:
            'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
          transitionTimingFunction: vars.transition.timing,
          transitionDuration: vars.transition.duration,
          selectors: {
            '&:not(:has( > h3 > [data-disabled])):hover': {
              backgroundColor: vars.color.surface.hover,
            },
          },
        }),
      },
    ],
  }),
  heading: style(component({ display: 'flex', minWidth: 0, flexGrow: 1 })),
  trigger: recipe({
    base: [trigger, focusRingQuiet],
    variants: {
      size: {
        default: [shared.text.sm, component({ paddingBlock: space(3) })],
        sm: [shared.text.xs, component({ paddingBlock: space(2) })],
      },
      tone: {
        default: component({
          color: vars.color.fg.DEFAULT,
          '@media': {
            '(hover: hover)': {
              selectors: { '&:hover': { color: vars.color.fg.default } },
            },
          },
        }),
        accent: component({
          color: vars.color.accent.DEFAULT,
          '@media': {
            '(hover: hover)': {
              selectors: { '&:hover': { color: vars.color.accent.muted } },
            },
          },
        }),
      },
    },
  }),
  /** The same header as the trigger's, for a row with nothing to open. */
  staticRow: recipe({
    base: component({
      display: 'flex',
      width: '100%',
      alignItems: 'center',
      gap: space(2),
      textAlign: 'left',
      fontWeight: vars.weight.medium,
    }),
    variants: {
      size: {
        default: [shared.text.sm, component({ paddingBlock: space(3) })],
        sm: [shared.text.xs, component({ paddingBlock: space(2) })],
      },
      tone: {
        default: [shared.fg.strong],
        accent: [shared.fg.accent],
      },
    },
  }),
  label: style([shared.shrinkable, shared.grow]),
  trailing: style([shared.noShrink, component({ marginLeft: 'auto' })]),
  action: style([shared.noShrink, component({ paddingLeft: space(2) })]),
  chevron: recipe({
    base: component({
      flexShrink: 0,
      transitionProperty: 'transform, translate, scale, rotate',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: '200ms',
    }),
    variants: {
      size: {
        default: component(square(4)),
        sm: component(square(3)),
      },
      tone: {
        default: [shared.fg.subtle],
        accent: [shared.fg.accent],
      },
      chevron: {
        end: component({
          marginLeft: 'auto',
          selectors: { [`${trigger}[data-panel-open] &`]: { rotate: '180deg' } },
        }),
        start: component({
          rotate: '-90deg',
          selectors: { [`${trigger}[data-panel-open] &`]: { rotate: '0deg' } },
        }),
        none: component({ display: 'none' }),
      },
    },
  }),
  /** Holds the chevron's place in a static row, so labels line up with open-able rows. */
  chevronSpacer: styleVariants({
    default: component({ ...square(4), flexShrink: 0 }),
    sm: component({ ...square(3), flexShrink: 0 }),
  }),
  // Base UI measures the panel into a variable, which is what lets the height animate.
  panel: style([
    shared.text.sm,
    component({
      height: 'var(--accordion-panel-height)',
      overflow: 'hidden',
      transitionProperty: 'height',
      transitionDuration: '200ms',
      transitionTimingFunction: vars.ease.out,
      selectors: { '&[data-starting-style], &[data-ending-style]': { height: 0 } },
    }),
  ]),
  panelInner: recipe({
    variants: {
      variant: {
        list: {},
        boxed: component({ paddingInline: space(4), paddingTop: space(3) }),
        plain: {},
      },
      size: {
        default: component({ paddingBottom: space(4) }),
        sm: component({ paddingBottom: space(2) }),
      },
    },
  }),
};
