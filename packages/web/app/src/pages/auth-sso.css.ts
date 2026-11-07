import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space } from '../styles/space';
import * as shared from '../styles/shared.css';

export const authSsoStyles = {
  footer: style([shared.textCenter, shared.text.sm, utility({ marginTop: space(4) })]),
  link: style(utility({ textDecorationLine: 'underline' })),
};
