import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import { animate } from '../styles/animations.css';
import * as shared from '../styles/shared.css';
import { palette, vars } from '../styles/theme.css';

export const authSignInStyles = {
  // A shimmer sweeps across the sign-in button while the request is in flight.
  pendingButton: style([shared.relative, shared.inlineFlex, shared.fullWidth]),
  shimmer: style(
    utility({
      pointerEvents: 'none',
      position: 'absolute',
      inset: '0px',
      animation: animate.shimmer,
      borderRadius: vars.radius.sm,
      backgroundImage: `linear-gradient(110deg,transparent,30%,hsl(${palette.line.strong}/0.35),70%,transparent)`,
      backgroundSize: '200% 100%',
    }),
  ),
  forgotPassword: style(
    utility({
      marginLeft: 'auto',
      display: 'inline-block',
      fontSize: vars.text.sm,
      lineHeight: vars.text.smLineHeight,
      textDecorationLine: 'underline',
    }),
  ),
  providerIcon: style(utility({ marginRight: space(4), ...square(4) })),
  footer: style(utility({ marginTop: space(4) })),
  footerLink: style(utility({ textDecorationLine: 'underline' })),
};
