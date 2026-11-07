import { globalStyle, style } from '@vanilla-extract/css';
import { layered } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import * as shared from '../../../../styles/shared.css';

const s = layered.components;

const item = style({});

// Margins rather than a flex gap, so the item stays in block flow and its label stays inline.
globalStyle(`:where(${item} > :not(:last-child))`, s({ marginBlockEnd: space(2) }));

export const formStyles = {
  form: style([shared.stack.base, s({ gap: space(5) })]),
  /** One field, label to message; the same for the div and the fieldset form. */
  item,
  message: style([shared.text.control, shared.fg.critical, s({ minHeight: '1.25rem' })]),
};
