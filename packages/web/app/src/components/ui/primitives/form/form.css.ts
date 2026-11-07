import { globalStyle, style } from '@vanilla-extract/css';
import { component } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import * as shared from '../../../../styles/shared.css';

const item = style({});

// Margins rather than a flex gap, so the item stays in block flow and its label stays inline.
globalStyle(`:where(${item} > :not(:last-child))`, component({ marginBlockEnd: space(2) }));

export const formStyles = {
  form: style([shared.stack.base, component({ gap: space(5) })]),
  /** One field, label to message; the same for the div and the fieldset form. */
  item,
  message: style([shared.text.control, shared.fg.critical, component({ minHeight: '1.25rem' })]),
};
