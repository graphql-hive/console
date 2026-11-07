import { style, styleVariants } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../../styles/layered';
import { square } from '../../../../styles/space';
import { focusRing } from '../shared-styles';
import { vars } from '../../../../styles/theme.css';

export const checkboxStyles = {
  root: recipe({
    base: [
      focusRing,
      component({
        display: 'inline-flex',
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: vars.radius.sm,
        borderStyle: 'solid',
        borderWidth: 1,
        transitionProperty:
          'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
        transitionTimingFunction: vars.transition.timing,
        transitionDuration: vars.transition.duration,
        selectors: {
          '&[data-disabled]': { pointerEvents: 'none', cursor: 'not-allowed', opacity: 0.5 },
        },
      }),
    ],
    variants: {
      size: {
        sm: component(square(3.5)),
        md: component(square(4.5)),
      },
      variant: {
        default: component({
          borderColor: vars.color.line.strong,
          selectors: {
            '&[data-checked], &[data-indeterminate]': {
              borderColor: vars.color.accent.line,
              backgroundColor: vars.color.accent.tintStrong,
              color: vars.color.accent.DEFAULT,
            },
          },
          '@media': {
            '(hover: hover)': {
              selectors: {
                '&:not([data-disabled]):hover': {
                  borderColor: vars.color.accent.line,
                  backgroundColor: vars.color.neutral[6],
                },
                '&:not([data-disabled])[data-checked]:hover': {
                  backgroundColor: vars.color.accent.tint,
                },
              },
            },
          },
        }),
      },
    },
    defaultVariants: { size: 'md', variant: 'default' },
  }),
  indicator: style(
    component({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'currentcolor',
    }),
  ),
  /** The check or dash, by the box's size. */
  icon: styleVariants({
    sm: component(square(2.5)),
    md: component(square(3)),
  }),
};
