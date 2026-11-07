import { styleVariants } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { layered } from '../../../../styles/layered';
import { space, square } from '../../../../styles/space';
import { focusRingQuiet } from '../shared-styles';
import * as shared from '../../../../styles/shared.css';
import { vars } from '../../../../styles/theme.css';
import * as utilities from '../../../../styles/utilities.css';

const s = layered.components;

export const tabsStyles = {
  root: recipe({
    variants: {
      variant: {
        underline: {},
        header: s({ width: '100%' }),
      },
      orientation: {
        horizontal: {},
        vertical: s({ display: 'flex', minHeight: 0, gap: space(8) }),
      },
    },
  }),
  /**
   * A horizontal strip scrolls sideways once its tabs outgrow it, with the scrollbar hidden the
   * way tab strips usually are; the arrow keys still reach every tab. Inline-size containment
   * keeps the tabs from counting toward the width of the flex columns above, which would
   * otherwise stretch to fit them and push the page sideways instead. A scroll container clips on
   * both axes, so the wrapper pads by the focus ring's reach (4px) plus the indicator's pixel
   * below the border, and pulls the same back with negative margins.
   */
  scroller: recipe({
    variants: {
      orientation: {
        horizontal: [
          utilities.noScrollbar,
          s({
            marginInline: space(-1),
            marginTop: space(-1),
            marginBottom: -5,
            minWidth: 0,
            flexGrow: 1,
            overflowX: 'auto',
            paddingInline: space(1),
            paddingTop: space(1),
            paddingBottom: 5,
            contain: 'inline-size',
          }),
        ],
        vertical: {},
      },
    },
  }),
  list: recipe({
    base: s({ position: 'relative', display: 'flex' }),
    variants: {
      variant: {
        underline: s({ gap: space(1), borderColor: vars.color.line.DEFAULT }),
        header: s({ height: space(10), flexGrow: 1, gap: space(1), paddingInline: space(2) }),
      },
      orientation: {
        horizontal: s({ width: 'max-content', minWidth: '100%', alignItems: 'center' }),
        vertical: s({ flexDirection: 'column', alignItems: 'stretch' }),
      },
    },
    compoundVariants: [
      {
        variants: { variant: 'underline', orientation: 'horizontal' },
        style: s({ borderBottomStyle: 'solid', borderBottomWidth: 1 }),
      },
      {
        variants: { variant: 'underline', orientation: 'vertical' },
        style: s({ borderLeftStyle: 'solid', borderLeftWidth: 1 }),
      },
    ],
  }),
  /** The accent bar under (or beside) the active tab. Base UI measures the tab into variables. */
  indicator: recipe({
    base: s({
      position: 'absolute',
      backgroundColor: vars.color.accent.DEFAULT,
      transitionProperty: 'left, width, top, height',
      transitionDuration: '200ms',
      transitionTimingFunction: vars.ease.authentic,
    }),
    variants: {
      variant: {
        underline: {},
        header: s({
          bottom: -1,
          left: 'var(--active-tab-left)',
          height: space(0.5),
          width: 'var(--active-tab-width)',
        }),
      },
      orientation: {
        horizontal: {},
        vertical: {},
      },
    },
    compoundVariants: [
      {
        variants: { variant: 'underline', orientation: 'horizontal' },
        style: s({
          bottom: -1,
          left: 'var(--active-tab-left)',
          height: space(0.5),
          width: 'var(--active-tab-width)',
        }),
      },
      {
        variants: { variant: 'underline', orientation: 'vertical' },
        style: s({
          top: 'var(--active-tab-top)',
          left: -1,
          height: 'var(--active-tab-height)',
          width: space(0.5),
        }),
      },
    ],
  }),
  // Base UI keeps the outgoing panel mounted until its exit transition ends, which without an
  // animation is still a frame or so of both panels stacked, so hide it the moment it starts ending.
  panel: recipe({
    base: s({
      outlineStyle: 'none',
      selectors: { '&[data-ending-style]': { display: 'none' } },
    }),
    variants: {
      orientation: {
        horizontal: s({ paddingTop: space(4) }),
        vertical: s({ minWidth: 0, flex: 1, overflowY: 'auto' }),
      },
    },
  }),
  tab: recipe({
    base: [
      focusRingQuiet,
      s({
        position: 'relative',
        zIndex: 10,
        display: 'inline-flex',
        flexShrink: 0,
        cursor: 'pointer',
        alignItems: 'center',
        gap: space(2),
        borderRadius: vars.radius.sm,
        fontWeight: vars.weight.medium,
        whiteSpace: 'nowrap',
        color: vars.color.fg.secondary,
        transitionProperty:
          'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
        transitionTimingFunction: vars.transition.timing,
        transitionDuration: vars.transition.duration,
        selectors: {
          '&[data-active]': { color: vars.color.accent.DEFAULT },
          '&[data-disabled]': { pointerEvents: 'none', opacity: 0.5 },
        },
        '@media': {
          '(hover: hover)': {
            selectors: { '&:hover': { color: vars.color.fg.DEFAULT } },
          },
        },
      }),
    ],
    variants: {
      variant: {
        underline: s({ selectors: { '&:focus-visible': { outlineOffset: 2 } } }),
        // Inside a band, so the ring sits within the tab rather than clipping on the band's edge.
        header: s({ height: '100%', selectors: { '&:focus-visible': { outlineOffset: -2 } } }),
      },
      size: {
        default: {},
        sm: {},
      },
      orientation: {
        horizontal: {},
        vertical: s({ justifyContent: 'flex-start' }),
      },
    },
    compoundVariants: [
      {
        variants: { variant: 'underline', size: 'default' },
        style: [shared.text.sm, s({ paddingInline: space(3), paddingBlock: space(2) })],
      },
      {
        variants: { variant: 'underline', size: 'sm' },
        style: [shared.text.xs, s({ paddingInline: space(2.5), paddingBlock: space(1.5) })],
      },
      {
        variants: { variant: 'header', size: 'default' },
        style: [shared.text.xs, s({ paddingInline: space(2.5), paddingBlock: 0 })],
      },
      {
        variants: { variant: 'header', size: 'sm' },
        style: [shared.text.xs, s({ paddingInline: space(2), paddingBlock: 0 })],
      },
      // Over the list's border, so the indicator sits on it.
      {
        variants: { variant: 'underline', orientation: 'horizontal' },
        style: s({ marginBottom: -1 }),
      },
      {
        variants: { variant: 'underline', orientation: 'vertical' },
        style: s({ marginLeft: -1 }),
      },
    ],
  }),
  /** A tab's icon, by the tab's size. */
  icon: styleVariants({
    default: s({ ...square(4), flexShrink: 0 }),
    sm: s({ ...square(3.5), flexShrink: 0 }),
  }),
  /** A disabled button fires no pointer events, so this span carries a tab's tooltip hover. */
  tooltipTrigger: shared.inlineFlex,
};
