import { style } from '@vanilla-extract/css';
import * as shared from '../../../styles/shared.css';

export const scopeBarStyles = {
  label: style([shared.text.control, shared.fg.secondary]),
};
