import { globalStyle, style, styleVariants } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import { focusRingQuiet } from '../primitives/shared-styles';
import { animate } from '../../../styles/animations.css';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const listColumn = style(
  component({
    display: 'flex',
    width: space(48),
    flexShrink: '0',
    flexDirection: 'column',
  }),
);

globalStyle(
  `:where(${listColumn} > :not(:last-child))`,
  component({
    marginBlockStart: '0',
    marginBlockEnd: space(1),
  }),
);

export const navigationStyles = {
  list: recipe({
    variants: {
      variant: {
        underline: component({
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
        }),
        pill: component({
          display: 'inline-flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: space(1),
          borderRadius: vars.radius.md,
          backgroundColor: vars.color.neutral[3],
          padding: space(1),
        }),
        list: listColumn,
      },
    },
  }),
  item: recipe({
    base: [
      focusRingQuiet,
      component({
        display: 'inline-flex',
        flexShrink: '0',
        alignItems: 'center',
        gap: space(2),
        fontSize: vars.text.sm,
        lineHeight: vars.text.smLineHeight,
        fontWeight: vars.weight.medium,
        whiteSpace: 'nowrap',
        transitionProperty:
          'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
        transitionTimingFunction: vars.transition.timing,
        transitionDuration: vars.transition.duration,
      }),
    ],
    variants: {
      variant: {
        underline: component({
          borderBottomStyle: 'solid',
          borderBottomWidth: '2px',
          selectors: {
            '&:focus-visible': { outlineOffset: '2px' },
          },
        }),
        pill: component({
          borderRadius: vars.radius.sm,
          selectors: {
            '&:focus-visible': { outlineOffset: '2px' },
          },
        }),
        list: component({
          justifyContent: 'flex-start',
          borderRadius: vars.radius.md,
          paddingInline: space(4),
          paddingBlock: space(2),
          textAlign: 'left',
        }),
      },
      size: {
        default: {},
        sm: {},
      },
    },
    compoundVariants: [
      {
        variants: { variant: 'underline', size: 'default' },
        style: component({ paddingInline: space(4), paddingBlock: space(3) }),
      },
      {
        variants: { variant: 'underline', size: 'sm' },
        style: component({ paddingInline: space(3), paddingBlock: space(2) }),
      },
      {
        variants: { variant: 'pill', size: 'default' },
        style: component({ paddingInline: space(4), paddingBlock: space(1.5) }),
      },
      {
        variants: { variant: 'pill', size: 'sm' },
        style: component({ paddingInline: space(3), paddingBlock: space(1) }),
      },
    ],
  }),
  // The router applies one of these per link, so the pair for a variant never shares a class.
  active: styleVariants({
    underline: component({
      borderColor: vars.color.accent.DEFAULT,
      color: vars.color.fg.DEFAULT,
    }),
    pill: component({
      backgroundColor: vars.color.surface.selected,
      color: vars.color.fg.DEFAULT,
    }),
    list: component({
      backgroundColor: vars.color.neutral[5],
      color: vars.color.fg.DEFAULT,
      selectors: {
        '&:where(.dark, .dark *)': { backgroundColor: vars.color.neutral[3] },
      },
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { backgroundColor: vars.color.neutral[5] },
            '&:where(.dark, .dark *):hover': { backgroundColor: vars.color.neutral[3] },
          },
        },
      },
    }),
  }),
  inactive: styleVariants({
    underline: component({
      borderColor: 'transparent',
      color: vars.color.fg.default,
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': {
              borderColor: vars.color.accent.muted,
              color: vars.color.fg.DEFAULT,
            },
          },
        },
      },
    }),
    pill: component({
      color: vars.color.fg.default,
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { color: vars.color.fg.DEFAULT },
          },
        },
      },
    }),
    list: component({
      color: vars.color.fg.default,
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': {
              color: vars.color.fg.DEFAULT,
              textDecorationLine: 'underline',
            },
          },
        },
      },
    }),
  }),
  icon: style(component({ ...square(4), flexShrink: '0' })),
  // Loading placeholders, laid out like the list or like a row of underline tabs.
  skeleton: styleVariants({
    list: [
      shared.stack.base,
      component({
        width: space(48),
        rowGap: space(3),
        paddingInline: space(4),
        paddingBlock: space(2),
      }),
    ],
    row: component({
      display: 'flex',
      flexDirection: 'row',
      columnGap: space(8),
      borderBottomStyle: 'solid',
      borderBottomWidth: '2px',
      borderBottomColor: 'transparent',
      paddingInline: space(4),
      paddingBlock: space(3),
    }),
  }),
  skeletonItem: style(
    component({
      height: space(5),
      width: space(12),
      animation: animate.pulse,
      borderRadius: vars.radius.full,
      backgroundColor: vars.color.neutral[5],
    }),
  ),
};
