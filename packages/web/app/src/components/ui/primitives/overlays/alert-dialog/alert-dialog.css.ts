import { style } from '@vanilla-extract/css';
import { component } from '../../../../../styles/layered';
import { vars } from '../../../../../styles/theme.css';
import { overlayPartsStyles } from '../overlay-parts.css';

export const alertDialogStyles = {
  // The surface, centred and sized, entering and leaving with a short fade and scale.
  popup: style([
    overlayPartsStyles.surface,
    component({
      position: 'fixed',
      top: '50%',
      left: '50%',
      maxHeight: 'calc(100dvh - 4rem)',
      width: 'calc(100vw - 2rem)',
      maxWidth: '520px',
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
