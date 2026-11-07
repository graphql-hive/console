import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space } from '../styles/space';
import * as shared from '../styles/shared.css';

export const authResetPasswordStyles = {
  sentNote: style([shared.text.sm, shared.fg.secondary]),
  resend: style(utility({ textDecorationLine: 'underline' })),
  footer: style([shared.textCenter, shared.text.sm, utility({ marginTop: space(4) })]),
  footerLink: style(utility({ textDecorationLine: 'underline' })),
};
