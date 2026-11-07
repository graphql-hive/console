import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space, square } from '../../styles/space';
import { vars } from '../../styles/theme.css';

export const backLinkStyles = {
  root: style(
    utility({
      marginBottom: space(5),
      display: 'inline-flex',
      alignItems: 'center',
      gap: space(0.5),
      fontSize: vars.text.control,
      lineHeight: vars.text.controlLineHeight,
      color: vars.color.fg.secondary,
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
  icon: style(utility(square(3.5))),
};
