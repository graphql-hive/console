import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../../styles/layered';
import { space, square } from '../../../../styles/space';
import { controlSize, controlSurface, focusRing } from '../shared-styles';
import * as shared from '../../../../styles/shared.css';
import { vars } from '../../../../styles/theme.css';

// Everything a field is before its surface: colour, shape, transition, and its disabled and
// invalid states. The surface (fill and border colour) is the `onSurface` variant.
const fieldBase = style(
  component({
    color: vars.color.fg.DEFAULT,
    minWidth: 0,
    appearance: 'none',
    borderRadius: vars.radius.sm,
    borderStyle: 'solid',
    borderWidth: 1,
    transitionProperty:
      'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
    transitionTimingFunction: vars.transition.timing,
    transitionDuration: vars.transition.duration,
    selectors: {
      '&::placeholder': { color: vars.color.fg.subtle },
      // Pointer focus shows no outline; keyboard focus shows the shared ring, which this must not
      // out-order, so it stays off `:focus-visible`.
      '&:focus:not(:focus-visible)': { outlineStyle: 'none' },
      '&:disabled': { cursor: 'not-allowed', opacity: 0.5 },
      '&[aria-invalid="true"], &[aria-invalid="true"]:focus': {
        borderColor: vars.color.critical.DEFAULT,
      },
    },
    '@media': {
      '(hover: hover)': {
        selectors: { '&[aria-invalid="true"]:hover': { borderColor: vars.color.critical.DEFAULT } },
      },
    },
  }),
);

/** The field itself, shared with Textarea. Fill and border come from the `onSurface` variant. */
export const field = style([fieldBase, focusRing]);

export const inputStyles = {
  field,
  root: recipe({
    base: [field],
    variants: {
      // Font size is set here rather than by composing a text primitive, because the control
      // size it sits on sets one too and the later rule has to be this one.
      size: {
        compact: [
          controlSize.compact,
          component({
            paddingInline: space(2.5),
            fontSize: vars.text.sm,
            lineHeight: vars.text.smLineHeight,
          }),
        ],
        default: [
          controlSize.default,
          component({
            paddingInline: space(3),
            fontSize: vars.text.sm,
            lineHeight: vars.text.smLineHeight,
          }),
        ],
      },
      onSurface: {
        base: component({
          borderColor: vars.color.line.control,
          backgroundColor: vars.color.surface.control,
          selectors: {
            '&:focus': {
              borderColor: vars.color.neutral[7],
              backgroundColor: vars.color.neutral[1],
            },
            '&:where(.dark, .dark *):focus': { backgroundColor: vars.color.neutral[4] },
          },
          '@media': {
            '(hover: hover)': {
              selectors: { '&:hover': { borderColor: vars.color.line.strong } },
            },
          },
        }),
        raised: [
          controlSurface.raised,
          component({
            selectors: {
              '&:focus': { borderColor: vars.color.neutral[7] },
              '&:where(.dark, .dark *):focus': { backgroundColor: vars.color.neutral[6] },
            },
            '@media': {
              '(hover: hover)': {
                selectors: {
                  '&:hover': { borderColor: vars.color.line.strong },
                  '&:where(.dark, .dark *):hover': { borderColor: vars.color.neutral[7] },
                },
              },
            },
          }),
        ],
      },
      width: {
        full: component({ width: '100%' }),
        xs: component({ width: space(16) }),
        sm: component({ width: space(48) }),
        md: component({ width: space(96) }),
      },
      mono: {
        true: component({
          fontFamily: vars.font.mono,
          fontSize: vars.text.xs,
          lineHeight: vars.text.xsLineHeight,
        }),
        false: {},
      },
      /** Room inside the edge for what sits there. */
      leadingIcon: {
        true: component({ paddingLeft: space(9) }),
      },
      trailing: {
        true: component({ paddingRight: space(9) }),
      },
      /** Joined to a prefix block on its left. */
      prefixed: {
        true: component({ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }),
      },
    },
    defaultVariants: { size: 'default', onSurface: 'base', width: 'full', mono: false },
  }),
  // The width stays on the field: a fixed field keeps its size and a prefix adds its own, so a
  // long slug prefix cannot squeeze the field. A fluid field needs the wrapper to be fluid too.
  wrapper: recipe({
    base: [shared.relative, shared.inlineRow.base],
    variants: {
      fluid: {
        true: [shared.fullWidth],
      },
    },
  }),
  /** The block before a slug. It sits one step further from the page than the field it joins. */
  prefix: recipe({
    base: component({
      display: 'inline-flex',
      flexShrink: 0,
      alignItems: 'center',
      borderTopLeftRadius: vars.radius.sm,
      borderBottomLeftRadius: vars.radius.sm,
      borderStyle: 'solid',
      borderWidth: 1,
      borderRightWidth: 0,
      paddingInline: space(3),
      fontSize: vars.text.sm,
      lineHeight: vars.text.smLineHeight,
      whiteSpace: 'nowrap',
      color: vars.color.fg.secondary,
    }),
    variants: {
      size: {
        compact: [controlSize.compact],
        default: [controlSize.default],
      },
      onSurface: {
        base: component({
          borderColor: vars.color.line.control,
          backgroundColor: vars.color.neutral[3],
          selectors: { '&:where(.dark, .dark *)': { backgroundColor: vars.color.neutral[4] } },
        }),
        raised: component({
          borderColor: vars.color.line.DEFAULT,
          backgroundColor: vars.color.neutral[3],
          selectors: {
            '&:where(.dark, .dark *)': {
              borderColor: vars.color.line.strong,
              backgroundColor: vars.color.neutral[6],
            },
          },
        }),
      },
    },
    defaultVariants: { size: 'default', onSurface: 'base' },
  }),
  leadingIcon: style(
    component({
      pointerEvents: 'none',
      position: 'absolute',
      left: space(3),
      ...square(4),
      color: vars.color.fg.muted,
    }),
  ),
  trailing: style([shared.inlineRow.base, component({ position: 'absolute', right: space(1.5) })]),
};
