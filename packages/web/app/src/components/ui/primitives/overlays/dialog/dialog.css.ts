import { style, styleVariants } from '@vanilla-extract/css';
import { component } from '../../../../../styles/layered';
import { vars } from '../../../../../styles/theme.css';
import { overlayPartsStyles } from '../overlay-parts.css';

export const dialogStyles = {
  width: styleVariants({
    sm: component({ maxWidth: '425px' }),
    md: component({ maxWidth: '520px' }),
    lg: component({ maxWidth: '640px' }),
    xl: component({ maxWidth: '960px' }),
  }),
  // The surface, centred and sized, entering and leaving with a short fade and scale.
  popup: style([
    overlayPartsStyles.surface,
    component({
      position: 'fixed',
      top: '50%',
      left: '50%',
      maxHeight: 'calc(100dvh - 4rem)',
      width: 'calc(100vw - 2rem)',
      translate: '-50% -50%',
      borderRadius: vars.radius.lg,
      transitionProperty: 'opacity, scale',
      transitionDuration: '200ms',
      transitionTimingFunction: vars.ease.authentic,
      selectors: {
        '&[data-starting-style]': { scale: '95% 95%', opacity: '0%' },
        '&[data-ending-style]': { scale: '95% 95%', opacity: '0%' },
      },
    }),
  ]),
};
