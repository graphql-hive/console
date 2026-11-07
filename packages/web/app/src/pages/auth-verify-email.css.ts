import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { square } from '../styles/space';
import { animate } from '../styles/animations.css';
import { vars } from '../styles/theme.css';

export const authVerifyEmailStyles = {
  spinnerRow: style(
    utility({
      display: 'flex',
      justifyContent: 'center',
    }),
  ),
  spinner: style(
    utility({
      ...square(8),
      animation: animate.spin,
      borderRadius: vars.radius.full,
      borderStyle: 'solid',
      borderWidth: '2px',
      borderTopColor: vars.color.fg.muted,
    }),
  ),
};
