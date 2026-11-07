import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import * as shared from '../styles/shared.css';

export const authSignUpStyles = {
  providerIcon: style(utility({ marginRight: space(4), ...square(4) })),
  footer: style([shared.textCenter, shared.text.sm, utility({ marginTop: space(4) })]),
  footerLink: style(utility({ textDecorationLine: 'underline' })),
};
