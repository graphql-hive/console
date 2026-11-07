import { recipe } from '@vanilla-extract/recipes';
import { layered } from '../../../../styles/layered';
import { space, square } from '../../../../styles/space';
import { focusRing } from '../shared-styles';
import { vars } from '../../../../styles/theme.css';

const s = layered.components;

export const switchStyles = {
  root: recipe({
    base: [
      focusRing,
      s({
        position: 'relative',
        display: 'inline-flex',
        flexShrink: 0,
        cursor: 'pointer',
        alignItems: 'center',
        borderRadius: vars.radius.full,
        transitionProperty:
          'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
        transitionTimingFunction: vars.transition.timing,
        transitionDuration: vars.transition.duration,
        selectors: {
          '&[data-checked]': { backgroundColor: vars.color.success.DEFAULT },
          '&[data-unchecked]': { backgroundColor: vars.color.neutral[6] },
          '&[data-disabled]': { cursor: 'not-allowed', opacity: 0.5 },
        },
        '@media': {
          '(hover: hover)': {
            selectors: {
              '&:not([data-disabled])[data-checked]:hover': {
                backgroundColor: vars.color.success.muted,
              },
              '&:not([data-disabled])[data-unchecked]:hover': {
                backgroundColor: vars.color.neutral[8],
              },
            },
          },
        },
      }),
    ],
    variants: {
      size: {
        standard: s({ height: space(5), width: space(10), padding: space(0.5) }),
        small: s({ height: space(2.5), width: space(6) }),
      },
      /** A read-out rather than a control: the cursor is whatever owns the click. */
      decorative: {
        true: s({ cursor: 'inherit' }),
      },
    },
    defaultVariants: { size: 'standard' },
  }),
  thumb: recipe({
    base: s({
      pointerEvents: 'none',
      display: 'block',
      borderRadius: vars.radius.full,
      backgroundColor: vars.color.neutral[1],
      boxShadow: '0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.25)',
      transitionProperty: 'transform, translate, scale, rotate',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: vars.transition.duration,
      selectors: {
        '&[data-unchecked]': { backgroundColor: vars.color.neutral[4] },
        '&:where(.dark, .dark *)': { backgroundColor: vars.color.neutral[12] },
        '&[data-unchecked]:where(.dark, .dark *)': { backgroundColor: vars.color.neutral[10] },
      },
    }),
    variants: {
      size: {
        standard: s({
          ...square(4),
          selectors: { '&[data-checked]': { translate: `${space(5)} 0` } },
        }),
        small: s({
          width: 13,
          height: 13,
          selectors: { '&[data-checked]': { translate: '11px 0' } },
        }),
      },
    },
    defaultVariants: { size: 'standard' },
  }),
};
