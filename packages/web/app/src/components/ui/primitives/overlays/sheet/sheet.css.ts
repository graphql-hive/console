import { style, styleVariants } from '@vanilla-extract/css';
import { component } from '../../../../../styles/layered';
import { vars } from '../../../../../styles/theme.css';
import { overlayPartsStyles } from '../overlay-parts.css';

export const sheetStyles = {
  width: styleVariants({
    md: component({ '@media': { '(width >= 40rem)': { maxWidth: '700px' } } }),
    lg: component({ '@media': { '(width >= 40rem)': { maxWidth: '800px' } } }),
    half: component({ '@media': { '(width >= 40rem)': { maxWidth: '50vw' } } }),
  }),
  // The surface, pinned to the right edge, sliding in and out.
  popup: style([
    overlayPartsStyles.surface,
    component({
      position: 'fixed',
      insetBlock: '0px',
      right: '0px',
      height: '100dvh',
      width: '100%',
      borderLeftStyle: 'solid',
      borderLeftWidth: '1px',
      transitionProperty: 'translate, opacity',
      transitionDuration: '300ms',
      transitionTimingFunction: vars.ease.authentic,
      selectors: {
        '&[data-starting-style]': { translate: '100% 0', opacity: '0%' },
        '&[data-ending-style]': { translate: '100% 0', opacity: '0%' },
      },
    }),
  ]),
};
