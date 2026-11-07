import { style } from '@vanilla-extract/css';
import { component } from '../../../../styles/layered';
import { space, square } from '../../../../styles/space';
import * as shared from '../../../../styles/shared.css';
import { vars } from '../../../../styles/theme.css';

export const filterDropdownStyles = {
  removeButton: style(
    component({
      display: 'flex',
      cursor: 'pointer',
      alignItems: 'center',
      paddingInline: space(2),
      paddingBlock: space(1.5),
      color: vars.color.fg.subtle,
      transitionProperty:
        'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: vars.transition.duration,
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { color: vars.color.fg.DEFAULT },
          },
        },
      },
    }),
  ),
  label: style([
    shared.text.control,
    component({
      paddingInline: space(2.5),
      paddingBlock: space(1.5),
    }),
  ]),
  removeIcon: style(component(square(3.5))),
};
