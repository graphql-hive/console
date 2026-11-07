import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../../styles/layered';
import { square } from '../../../../styles/space';
import { vars } from '../../../../styles/theme.css';

export const itemRowStyles = {
  name: recipe({
    base: component({
      flex: '1',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }),
    variants: {
      unavailable: {
        true: component({
          color: vars.color.fg.subtle,
          textDecorationLine: 'line-through',
        }),
      },
    },
  }),
  chevron: style(
    component({
      marginLeft: 'auto',
      ...square(3.5),
    }),
  ),
};
