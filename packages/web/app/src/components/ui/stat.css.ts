import { style } from '@vanilla-extract/css';
import { component } from '../../styles/layered';
import { space } from '../../styles/space';
import * as shared from '../../styles/shared.css';

export const statStyles = {
  root: style(component({ lineHeight: space(6) })),
  label: style([shared.text.sm, shared.weight.medium, shared.fg.default]),
  number: style([shared.text['2xl'], shared.weight.semibold]),
  helpText: style([shared.text.sm, shared.fg.muted]),
};
