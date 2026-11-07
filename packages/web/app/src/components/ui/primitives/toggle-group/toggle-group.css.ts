import { recipe } from '@vanilla-extract/recipes';
import { layered } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import { controlSize, controlSurface, focusRing } from '../shared-styles';
import { palette, vars } from '../../../../styles/theme.css';

const s = layered.components;

export const toggleGroupStyles = {
  group: recipe({
    base: s({
      display: 'inline-flex',
      borderRadius: vars.radius.sm,
      borderStyle: 'solid',
      borderWidth: 1,
    }),
    variants: {
      size: {
        compact: [controlSize.compact],
        default: [controlSize.default],
      },
      onSurface: {
        base: [controlSurface.base],
        raised: [controlSurface.raised],
      },
    },
    defaultVariants: { size: 'compact', onSurface: 'base' },
  }),
  /** One segment. The separator is its own left border, in the group's border colour. */
  item: recipe({
    base: [
      focusRing,
      s({
        position: 'relative',
        display: 'flex',
        cursor: 'pointer',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'stretch',
        fontWeight: vars.weight.medium,
        color: vars.color.fg.muted,
        transitionProperty:
          'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
        transitionTimingFunction: vars.transition.timing,
        transitionDuration: vars.transition.duration,
        selectors: {
          '&:not(:first-child)': {
            borderLeftStyle: 'solid',
            borderLeftWidth: 1,
            borderLeftColor: 'inherit',
          },
          '&:first-child': { borderTopLeftRadius: 'inherit', borderBottomLeftRadius: 'inherit' },
          '&:last-child': { borderTopRightRadius: 'inherit', borderBottomRightRadius: 'inherit' },
          // Above its neighbours, so the focus outline is not cut by the next segment.
          '&:focus-visible': { zIndex: 10 },
          '&[data-disabled]': { pointerEvents: 'none', opacity: 0.5 },
          '&[data-pressed]': {
            backgroundColor: vars.color.neutral[3],
            color: vars.color.fg.DEFAULT,
          },
          '&:where(.dark, .dark *)': { color: vars.color.fg.default },
          '&:where(.dark, .dark *)[data-pressed]': { backgroundColor: vars.color.neutral[5] },
        },
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
    ],
    variants: {
      size: {
        compact: s({ paddingInline: space(3) }),
        default: s({ paddingInline: space(4) }),
      },
    },
    defaultVariants: { size: 'compact' },
  }),
};
