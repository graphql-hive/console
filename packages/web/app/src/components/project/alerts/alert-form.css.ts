import { style } from '@vanilla-extract/css';
import * as shared from '../../../styles/shared.css';

export const alertFormStyles = {
  error: style([shared.text.sm, shared.fg.critical]),
};
