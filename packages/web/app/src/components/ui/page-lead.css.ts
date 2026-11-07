import { style } from '@vanilla-extract/css';
import { component } from '../../styles/layered';
import { space } from '../../styles/space';
import * as shared from '../../styles/shared.css';

export const pageLeadStyles = {
  root: style([
    shared.stack.base,
    component({
      marginBottom: space(4),
      gap: space(1.5),
    }),
  ]),
  title: style([
    shared.text.lg,
    shared.weight.medium,
    shared.fg.strong,
    component({ margin: '0px' }),
  ]),
  description: style([shared.text.sm, shared.fg.default, component({ margin: '0px' })]),
};
