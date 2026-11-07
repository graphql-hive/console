import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';
import * as shared from '../../styles/shared.css';
import { vars } from '../../styles/theme.css';

export const getStartedTriggerStyles = {
  root: style(
    utility({
      cursor: 'pointer',
      borderRadius: vars.radius.sm,
      paddingInline: space(4),
      paddingBlock: space(2),
      textAlign: 'left',
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { opacity: '80%' },
          },
        },
      },
    }),
  ),
  title: style([shared.text.sm, shared.weight.medium, shared.fg.default]),
  progress: style([shared.text.xs, shared.fg.secondary]),
  bar: style([
    shared.relative,
    shared.fullWidth,
    utility({
      marginTop: space(1),
      height: '5px',
      overflow: 'hidden',
      borderRadius: vars.radius.sm,
      backgroundColor: vars.color.accent.tintStrong,
    }),
  ]),
  barFill: style(
    utility({
      height: '100%',
      backgroundColor: vars.color.accent.muted,
    }),
  ),
};
