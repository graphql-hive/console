import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

export const channelFormStyles = {
  link: style([
    shared.text.sm,
    shared.fg.accent,
    utility({
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { color: vars.color.accent.muted },
          },
        },
      },
    }),
  ]),
};
