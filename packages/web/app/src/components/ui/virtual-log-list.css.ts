import { style } from '@vanilla-extract/css';
import { component } from '../../styles/layered';
import { space } from '../../styles/space';
import * as shared from '../../styles/shared.css';

export const virtualLogListStyles = {
  row: style([
    shared.flex,
    shared.mono,
    shared.text.xs,
    component({
      paddingInline: space(2),
      paddingBottom: space(1),
    }),
  ]),
  time: style(component({ paddingRight: space(4) })),
};
