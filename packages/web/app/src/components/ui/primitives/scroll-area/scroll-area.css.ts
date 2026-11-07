import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import { vars } from '../../../../styles/theme.css';

// A flex column so a max-height on the root constrains the viewport, which a percentage height on
// the viewport would not. `contain: inline-size` stops the content's width from counting as the
// area's own: a grid or flex parent sizing its track to min-content would otherwise grow to the
// longest unbreakable row and push past its neighbours. Plain, because the viewport's gutters
// select on the root's overflow state.
const root = style(
  component({
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
        sm: component({ height: space(40) }),
        md: component({ height: space(60) }),
        lg: component({ height: space(90) }),
      },
      /** Scroll only once the content is taller than this. */
      maxHeight: {
        sm: component({ maxHeight: space(40) }),
        md: component({ maxHeight: space(60) }),
        lg: component({ maxHeight: space(90) }),
        screen: component({ maxHeight: '100vh' }),
      },
      /** Takes the remaining height of a flex column. */
      fill: {
        true: component({ minHeight: 0, flexGrow: 1 }),
      },
    },
  }),
  // The scrollbar is overlaid, so the viewport gives up the same gutter a native one would take,
  // but only once there is something to scroll, so short content sits flush.
  viewport: recipe({
    base: component({
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
        vertical: component({ overflowX: 'hidden', overflowY: 'auto' }),
        horizontal: component({ overflowX: 'auto', overflowY: 'hidden' }),
        both: component({ overflow: 'auto' }),
      },
    },
    defaultVariants: { axis: 'vertical' },
  }),
  // Overlaid, and only drawn while the pointer is over the area or it is scrolling. Base UI sets
  // `position: absolute` itself; the orientation says which edge.
  scrollbar: recipe({
    base: component({
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
        vertical: component({
          insetBlock: space(1),
          right: space(0.5),
          width: space(2),
          justifyContent: 'center',
        }),
        horizontal: component({
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
    base: component({
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
        vertical: component({ width: '100%' }),
        horizontal: component({ height: '100%' }),
      },
    },
  }),
};
