import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { layered } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import { vars } from '../../../../styles/theme.css';

const s = layered.components;

// A flex column so a max-height on the root constrains the viewport, which a percentage height on
// the viewport would not. `contain: inline-size` stops the content's width from counting as the
// area's own: a grid or flex parent sizing its track to min-content would otherwise grow to the
// longest unbreakable row and push past its neighbours. Plain, because the viewport's gutters
// select on the root's overflow state.
const root = style(
  s({
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    contain: 'inline-size',
  }),
);

export const scrollAreaStyles = {
  root: recipe({
    base: [root],
    variants: {
      height: {
        sm: s({ height: space(40) }),
        md: s({ height: space(60) }),
        lg: s({ height: space(90) }),
      },
      /** Scroll only once the content is taller than this. */
      maxHeight: {
        sm: s({ maxHeight: space(40) }),
        md: s({ maxHeight: space(60) }),
        lg: s({ maxHeight: space(90) }),
        screen: s({ maxHeight: '100vh' }),
      },
      /** Takes the remaining height of a flex column. */
      fill: {
        true: s({ minHeight: 0, flexGrow: 1 }),
      },
    },
  }),
  // The scrollbar is overlaid, so the viewport gives up the same gutter a native one would take,
  // but only once there is something to scroll, so short content sits flush.
  viewport: recipe({
    base: s({
      minHeight: 0,
      flex: 1,
      overscrollBehavior: 'contain',
      selectors: {
        [`${root}[data-has-overflow-x] &`]: { paddingBottom: space(2.5) },
        [`${root}[data-has-overflow-y] &`]: { paddingRight: space(2.5) },
      },
    }),
    variants: {
      /** Which way the content can overflow. The other axis is clipped. */
      axis: {
        vertical: s({ overflowX: 'hidden', overflowY: 'auto' }),
        horizontal: s({ overflowX: 'auto', overflowY: 'hidden' }),
        both: s({ overflow: 'auto' }),
      },
    },
    defaultVariants: { axis: 'vertical' },
  }),
  // Overlaid, and only drawn while the pointer is over the area or it is scrolling. Base UI sets
  // `position: absolute` itself; the orientation says which edge.
  scrollbar: recipe({
    base: s({
      display: 'flex',
      touchAction: 'none',
      borderRadius: vars.radius.full,
      userSelect: 'none',
      WebkitUserSelect: 'none',
      opacity: 0,
      transitionProperty: 'opacity',
      transitionTimingFunction: vars.transition.timing,
      transitionDelay: '300ms',
      transitionDuration: '200ms',
      selectors: {
        '&[data-hovering], &[data-scrolling]': {
          opacity: 1,
          transitionDelay: '0ms',
          transitionDuration: '100ms',
        },
      },
      '@media': {
        '(hover: hover)': {
          selectors: { '&:hover': { opacity: 1, transitionDelay: '0ms' } },
        },
      },
    }),
    variants: {
      orientation: {
        vertical: s({
          insetBlock: space(1),
          right: space(0.5),
          width: space(2),
          justifyContent: 'center',
        }),
        horizontal: s({
          insetInline: space(1),
          bottom: space(0.5),
          height: space(2),
          flexDirection: 'column',
          justifyContent: 'center',
        }),
      },
    },
  }),
  thumb: recipe({
    base: s({
      borderRadius: vars.radius.full,
      backgroundColor: vars.color.neutral[7],
      '@media': {
        '(hover: hover)': {
          selectors: { '&:hover': { backgroundColor: vars.color.neutral[8] } },
        },
      },
    }),
    variants: {
      orientation: {
        vertical: s({ width: '100%' }),
        horizontal: s({ height: '100%' }),
      },
    },
  }),
};
