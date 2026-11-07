import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../../styles/layered';
import { space, square } from '../../../../styles/space';
import * as shared from '../../../../styles/shared.css';
import { vars } from '../../../../styles/theme.css';

// Plain, because the card's radio ring selects on the item's checked state.
const item = style(
  component({
    display: 'flex',
    cursor: 'pointer',
    alignItems: 'center',
    borderStyle: 'solid',
    borderWidth: 1,
    transitionProperty:
      'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
    transitionTimingFunction: vars.transition.timing,
    transitionDuration: vars.transition.duration,
    selectors: { '&:disabled': { pointerEvents: 'none', opacity: 0.5 } },
  }),
);

export const radioGroupStyles = {
  group: recipe({
    base: component({ display: 'flex' }),
    variants: {
      orientation: {
        horizontal: component({ flexDirection: 'row' }),
        vertical: component({ flexDirection: 'column' }),
      },
      variant: {
        'as-card': component({ alignItems: 'stretch', gap: space(2) }),
        'as-button': component({ gap: space(1) }),
      },
    },
    compoundVariants: [
      {
        variants: { variant: 'as-button', orientation: 'horizontal' },
        style: component({ alignItems: 'center' }),
      },
      {
        variants: { variant: 'as-button', orientation: 'vertical' },
        style: component({ alignItems: 'flex-start' }),
      },
    ],
    defaultVariants: { orientation: 'horizontal', variant: 'as-button' },
  }),
  item: recipe({
    base: [item],
    variants: {
      variant: {
        'as-button': [
          shared.text.control,
          shared.weight.medium,
          component({
            gap: space(1.5),
            borderRadius: vars.radius.xs,
            paddingInline: space(3),
            paddingBlock: space(1.5),
          }),
        ],
        'as-card': [
          shared.text.sm,
          component({
            gap: space(4),
            borderRadius: vars.radius.md,
            padding: space(4),
            textAlign: 'left',
          }),
        ],
      },
      onSurface: {
        base: {},
        raised: {},
      },
      orientation: {
        horizontal: {},
        vertical: {},
      },
    },
    compoundVariants: [
      {
        variants: { variant: 'as-card', orientation: 'vertical' },
        style: component({ width: '100%' }),
      },
      {
        variants: { variant: 'as-card', orientation: 'horizontal' },
        style: component({ flex: 1, flexBasis: 0 }),
      },
      {
        variants: { variant: 'as-button', onSurface: 'base' },
        style: component({
          borderColor: vars.color.line.DEFAULT,
          backgroundColor: vars.color.neutral[2],
          color: vars.color.fg.default,
          selectors: {
            '&[data-checked]': {
              borderColor: vars.color.line.DEFAULT,
              backgroundColor: vars.color.neutral[4],
              color: vars.color.fg.DEFAULT,
            },
          },
          '@media': {
            '(hover: hover)': {
              selectors: {
                '&:hover': {
                  borderColor: vars.color.line.subtle,
                  backgroundColor: vars.color.neutral[3],
                  color: vars.color.fg.DEFAULT,
                },
              },
            },
          },
        }),
      },
      {
        variants: { variant: 'as-card', onSurface: 'base' },
        style: component({
          borderColor: vars.color.line.subtle,
          backgroundColor: 'transparent',
          selectors: {
            '&[data-checked]': {
              borderColor: vars.color.accent.line,
              backgroundColor: vars.color.neutral[3],
            },
          },
          '@media': {
            '(hover: hover)': {
              selectors: { '&:hover': { backgroundColor: vars.color.neutral[3] } },
            },
          },
        }),
      },
      {
        variants: { variant: 'as-button', onSurface: 'raised' },
        style: component({
          borderColor: vars.color.line.DEFAULT,
          backgroundColor: vars.color.neutral[3],
          color: vars.color.fg.default,
          selectors: {
            '&[data-checked]': {
              borderColor: vars.color.line.strong,
              backgroundColor: vars.color.neutral[5],
              color: vars.color.fg.DEFAULT,
            },
          },
          '@media': {
            '(hover: hover)': {
              selectors: {
                '&:hover': { backgroundColor: vars.color.neutral[4], color: vars.color.fg.DEFAULT },
              },
            },
          },
        }),
      },
      {
        variants: { variant: 'as-card', onSurface: 'raised' },
        style: component({
          borderColor: vars.color.line.DEFAULT,
          backgroundColor: vars.color.neutral[4],
          selectors: {
            '&[data-checked]': {
              borderColor: vars.color.accent.line,
              backgroundColor: vars.color.neutral[5],
            },
          },
          '@media': {
            '(hover: hover)': {
              selectors: { '&:hover': { backgroundColor: vars.color.neutral[5] } },
            },
          },
        }),
      },
    ],
    defaultVariants: { variant: 'as-button', onSurface: 'base', orientation: 'horizontal' },
  }),
  /** The card's radio: a ring that takes the accent while its item is checked. */
  ring: style([
    shared.row.base,
    shared.icon.lg,
    shared.noShrink,
    component({
      justifyContent: 'center',
      borderRadius: vars.radius.full,
      borderStyle: 'solid',
      borderWidth: 1,
      borderColor: vars.color.line.strong,
      selectors: { [`${item}[data-checked] &`]: { borderColor: vars.color.accent.DEFAULT } },
    }),
  ]),
  dot: style(
    component({
      ...square(2.5),
      borderRadius: vars.radius.full,
      backgroundColor: vars.color.accent.DEFAULT,
    }),
  ),
  cardText: shared.stack.gap2,
  cardLabel: style([shared.weight.medium, shared.fg.strong]),
  cardDescription: style(component({ lineHeight: 1.4, color: vars.color.fg.default })),
};
