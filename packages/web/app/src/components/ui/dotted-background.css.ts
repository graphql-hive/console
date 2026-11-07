import { style } from '@vanilla-extract/css';
import { component } from '../../styles/layered';
import * as patterns from '../../styles/patterns.css';
import * as shared from '../../styles/shared.css';
import { vars } from '../../styles/theme.css';

export const dottedBackgroundStyles = {
  root: style([
    patterns.bgDot.lineStrong,
    component({
      position: 'relative',
      display: 'flex',
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: vars.color.surface.inset,
    }),
  ]),
  // Fades the dots out towards the edges.
  vignette: style([
    shared.row.base,
    component({
      pointerEvents: 'none',
      position: 'absolute',
      inset: '0px',
      justifyContent: 'center',
      backgroundColor: vars.color.surface.inset,
      maskImage: 'radial-gradient(ellipse at center,transparent 20%,black)',
    }),
  ]),
};
