import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';
import { animate } from '../../styles/animations.css';
import { vars } from '../../styles/theme.css';

export const organizationSelectorStyles = {
  skeleton: style(
    utility({
      height: space(5),
      width: space(48),
      animation: animate.pulse,
      borderRadius: vars.radius.full,
      backgroundColor: vars.color.surface.skeleton,
    }),
  ),
};
