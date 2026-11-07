import { style } from '@vanilla-extract/css';
import { component } from '../../../../styles/layered';
import { space, square } from '../../../../styles/space';
import * as shared from '../../../../styles/shared.css';

export const textFilterChipStyles = {
  label: style([
    shared.text.control,
    component({
      paddingInline: space(2.5),
      paddingBlock: space(1.5),
    }),
  ]),
  value: style(
    component({
      maxWidth: space(40),
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }),
  ),
  removeIcon: style(component(square(3.5))),
};
