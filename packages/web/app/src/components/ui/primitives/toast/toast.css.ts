import { style, styleVariants } from '@vanilla-extract/css';
import { component } from '../../../../styles/layered';
import { space, square } from '../../../../styles/space';
import * as shared from '../../../../styles/shared.css';
import { vars } from '../../../../styles/theme.css';

/*
 * The stack is laid out by Base UI's variables: `--toast-index` from the front, the swipe offsets,
 * and the heights it measures. `--gap` is the space between expanded toasts and `--dir` is which
 * way the stack grows: down from the top on a phone, up from the bottom corner otherwise.
 */
export const toastStyles = {
  icon: styleVariants({
    default: component({ ...square(4), flexShrink: 0, color: vars.color.info.DEFAULT }),
    success: component({ ...square(4), flexShrink: 0, color: vars.color.success.DEFAULT }),
    destructive: component({ ...square(4), flexShrink: 0, color: vars.color.critical.DEFAULT }),
  }),
  viewport: style(
    component({
      position: 'fixed',
      zIndex: 100,
      insetInline: space(4),
      top: space(4),
      vars: { '--gap': '0.75rem', '--dir': '1' },
      '@media': {
        '(width >= 40rem)': {
          insetInline: 'auto',
          top: 'auto',
          right: space(6),
          bottom: space(6),
          width: 380,
          vars: { '--dir': '-1' },
        },
      },
    }),
  ),
  root: style(
    component({
      position: 'absolute',
      right: 0,
      top: 0,
      zIndex: 'calc(1000 - var(--toast-index))',
      width: '100%',
      height: 'var(--toast-frontmost-height,var(--toast-height))',
      borderRadius: vars.radius.lg,
      borderStyle: 'solid',
      borderWidth: 1,
      borderColor: vars.color.line.DEFAULT,
      backgroundColor: vars.color.neutral[3],
      color: vars.color.fg.DEFAULT,
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      transformOrigin: 'top',
      // Behind the front toast, each one is a step smaller and lower.
      transform:
        'scale(max(0, 1 - var(--toast-index) * 0.1)) translateX(var(--toast-swipe-movement-x)) translateY(calc(var(--toast-swipe-movement-y) + var(--toast-index) * 20% * var(--dir)))',
      transitionProperty: 'transform, opacity, height',
      transitionDuration: '300ms',
      transitionTimingFunction: vars.ease.authentic,
      selectors: {
        // Bridges the gap to the next toast so the pointer can travel the stack without collapsing it.
        '&::after': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: '100%',
          height: 'calc(var(--gap) + 1px)',
          width: '100%',
        },
        '&[data-expanded]': {
          height: 'var(--toast-height)',
          transform:
            'translateX(var(--toast-swipe-movement-x)) translateY(calc((var(--toast-offset-y) + var(--toast-index) * var(--gap)) * var(--dir) + var(--toast-swipe-movement-y)))',
        },
        '&[data-starting-style]': {
          transform: 'translateY(calc(-150% * var(--dir)))',
          opacity: 0,
        },
        '&[data-ending-style], &[data-limited]': { opacity: 0 },
        '&[data-ending-style]:not([data-limited])': {
          transform: 'translateY(calc(-150% * var(--dir)))',
        },
        '&[data-ending-style][data-swipe-direction=down]': {
          transform: 'translateY(calc(var(--toast-swipe-movement-y) + 150%))',
        },
        '&[data-ending-style][data-swipe-direction=up]': {
          transform: 'translateY(calc(var(--toast-swipe-movement-y) - 150%))',
        },
        '&[data-ending-style][data-swipe-direction=right]': {
          transform: 'translateX(calc(var(--toast-swipe-movement-x) + 150%))',
        },
        '&[data-ending-style][data-swipe-direction=left]': {
          transform: 'translateX(calc(var(--toast-swipe-movement-x) - 150%))',
        },
      },
      '@media': {
        '(width >= 40rem)': {
          top: 'auto',
          bottom: 0,
          transformOrigin: 'bottom',
          selectors: { '&::after': { top: 'auto', bottom: '100%' } },
        },
      },
    }),
  ),
  content: style(
    component({
      display: 'flex',
      alignItems: 'flex-start',
      gap: space(3),
      padding: space(4),
      paddingRight: space(11),
      transitionProperty: 'opacity',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: '200ms',
      selectors: {
        '&[data-behind]': { opacity: 0 },
        '&[data-expanded]': { opacity: 1 },
      },
    }),
  ),
  body: style([shared.stack.gap1, shared.fillShrinkable]),
  title: style([
    shared.text.sm,
    shared.weight.medium,
    shared.fg.strong,
    component({ userSelect: 'text', WebkitUserSelect: 'text' }),
  ]),
  description: style([
    shared.text.sm,
    shared.fg.default,
    component({ userSelect: 'text', WebkitUserSelect: 'text' }),
  ]),
  close: style(component({ position: 'absolute', top: space(2), right: space(2) })),
};
