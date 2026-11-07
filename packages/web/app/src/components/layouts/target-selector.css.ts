import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';
import { animate } from '../../styles/animations.css';
import { vars } from '../../styles/theme.css';

export const targetSelectorStyles = {
  skeleton: style(
    utility({
      height: space(5),
      width: space(48),
      maxWidth: '200px',
      animation: animate.pulse,
      borderRadius: vars.radius.full,
      backgroundColor: vars.color.surface.skeleton,
    }),
  ),
  separator: style(
    utility({
      color: vars.color.fg.secondary,
      fontStyle: 'italic',
    }),
  ),
};
