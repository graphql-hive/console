import { style } from '@vanilla-extract/css';
import { component } from '../../styles/layered';
import { space, square } from '../../styles/space';
import { vars } from '../../styles/theme.css';

export const resourceDetailsStyles = {
  infoButton: style(
    component({
      marginLeft: space(2),
      color: vars.color.fg.secondary,
    }),
  ),
  infoIcon: style(component(square(4))),
};
