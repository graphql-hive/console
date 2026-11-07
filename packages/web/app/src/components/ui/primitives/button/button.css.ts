import type { StyleRule } from '@vanilla-extract/css';
import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import { controlOnSurface, controlSize, focusRing, segmentSeparator } from '../shared-styles';
import * as shared from '../../../../styles/shared.css';
import { vars } from '../../../../styles/theme.css';

// Plain, because a segment's hover rule selects on the button being hovered.
const button = style(
  component({
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: vars.radius.sm,
    borderStyle: 'solid',
    borderWidth: 1,
    fontWeight: vars.weight.medium,
    transitionProperty:
      'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
    transitionTimingFunction: vars.transition.timing,
    transitionDuration: vars.transition.duration,
    selectors: {
      '&:disabled, &[aria-disabled="true"]': { pointerEvents: 'none', opacity: 0.5 },
    },
  }),
);

const hover = (rule: StyleRule) =>
  component({ '@media': { '(hover: hover)': { selectors: { '&:hover': rule } } } });

export const buttonStyles = {
  root: recipe({
    base: [button, focusRing],
    variants: {
      variant: {
        default: [
          component({
            color: vars.color.fg.muted,
            selectors: { '&:where(.dark, .dark *)': { color: vars.color.fg.default } },
          }),
          hover({ color: vars.color.fg.default }),
        ],
        active: component({
          borderColor: vars.color.line.DEFAULT,
          backgroundColor: vars.color.neutral[3],
          color: vars.color.fg.DEFAULT,
          selectors: {
            '&:where(.dark, .dark *)': {
              borderColor: vars.color.line.strong,
              backgroundColor: vars.color.neutral[5],
            },
          },
        }),
        action: [
          component({
            borderStyle: 'dashed',
            borderColor: vars.color.accent.line,
            backgroundColor: vars.color.accent.tintSubtle,
            color: vars.color.accent.muted,
          }),
          hover({
            borderColor: vars.color.accent.muted,
            backgroundColor: vars.color.accent.tint,
            color: vars.color.accent.DEFAULT,
          }),
        ],
        'muted-action': [
          component({ borderStyle: 'dashed' }),
          hover({
            borderColor: vars.color.neutral[7],
            backgroundColor: vars.color.neutral[3],
            color: vars.color.fg.DEFAULT,
          }),
        ],
        primary: [
          component({
            borderColor: 'transparent',
            backgroundColor: vars.color.surface.inverse,
            color: vars.color.fg.inverse,
          }),
          hover({ backgroundColor: vars.color.neutral[11] }),
        ],
        outline: [
          component({
            borderColor: vars.color.line.DEFAULT,
            backgroundColor: 'transparent',
            color: vars.color.fg.default,
          }),
          hover({ backgroundColor: vars.color.neutral[4], color: vars.color.fg.DEFAULT }),
        ],
        ghost: [
          component({
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            color: vars.color.fg.secondary,
          }),
          hover({ color: vars.color.fg.DEFAULT }),
        ],
        destructive: [
          component({
            borderColor: vars.color.critical.line,
            backgroundColor: vars.color.critical.tintSubtle,
            color: vars.color.critical.text,
          }),
          hover({
            borderColor: vars.color.critical.DEFAULT,
            backgroundColor: vars.color.critical.tint,
          }),
        ],
        link: [
          component({ color: vars.color.accent.DEFAULT, textUnderlineOffset: 4 }),
          hover({ textDecorationLine: 'underline' }),
        ],
      },
      size: {
        compact: [controlSize.compact],
        default: [controlSize.default],
        'icon-sm': component({ width: space(7), height: space(7), justifyContent: 'center' }),
      },
      layout: {
        children: {},
        label: {},
        iconOnly: component({ justifyContent: 'center' }),
      },
      width: {
        auto: {},
        full: component({ width: '100%' }),
      },
      onSurface: {
        base: {},
        raised: {},
      },
    },
    compoundVariants: [
      { variants: { variant: 'default', onSurface: 'base' }, style: [controlOnSurface.base] },
      { variants: { variant: 'default', onSurface: 'raised' }, style: [controlOnSurface.raised] },
      {
        variants: { layout: 'children', size: 'compact' },
        style: component({ gap: space(1), paddingInline: space(3) }),
      },
      {
        variants: { layout: 'children', size: 'default' },
        style: component({ gap: space(1.5), paddingInline: space(4) }),
      },
      {
        variants: { layout: 'iconOnly', size: 'compact' },
        style: component({ width: space(7.5) }),
      },
      { variants: { layout: 'iconOnly', size: 'default' }, style: component({ width: space(9) }) },
      {
        variants: { layout: 'children', width: 'full' },
        style: component({ justifyContent: 'center' }),
      },
      {
        variants: { variant: 'link' },
        style: component({
          height: 'auto',
          borderRadius: 0,
          borderWidth: 0,
          backgroundColor: 'transparent',
          padding: 0,
        }),
      },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
      layout: 'children',
      width: 'auto',
      onSurface: 'base',
    },
  }),
  /** The icon-only layout: the icon, padded to the button's edges. */
  iconSlot: style([shared.row.base, component({ padding: space(1.5) })]),
  iconOnlyIcon: shared.icon.md,
  /** The label layout: the label fills, and each segment after it stretches to the button's height. */
  label: style([
    shared.row.base,
    shared.grow,
    component({ alignSelf: 'stretch', paddingInline: space(3) }),
  ]),
  accessory: style([
    segmentSeparator,
    component({
      display: 'flex',
      alignItems: 'center',
      alignSelf: 'stretch',
      paddingInline: space(3),
    }),
  ]),
  rightIcon: recipe({
    base: [
      shared.fg.subtle,
      component({
        display: 'flex',
        alignItems: 'center',
        alignSelf: 'stretch',
        paddingInline: space(2),
      }),
    ],
    variants: {
      separated: {
        true: [segmentSeparator],
      },
      /** With its own action the segment lights up on its own hover; otherwise with the button's. */
      interactive: {
        true: hover({ color: vars.color.fg.default }),
        false: component({
          '@media': {
            '(hover: hover)': {
              selectors: { [`${button}:hover &`]: { color: vars.color.fg.DEFAULT } },
            },
          },
        }),
      },
    },
  }),
  rightIconGlyph: shared.icon.xs,
};
