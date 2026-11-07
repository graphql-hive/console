import { style } from '@vanilla-extract/css';
import { component } from '../../styles/layered';
import { space } from '../../styles/space';
import * as shared from '../../styles/shared.css';
import { vars } from '../../styles/theme.css';

export const inlineCodeStyles = {
  root: style([
    shared.row.gap2,
    shared.mono,
    shared.text.sm,
    shared.breakAll,
    component({
      borderRadius: vars.radius.md,
      backgroundColor: vars.color.surface.code,
      paddingBlock: space(1),
    }),
  ]),
  code: style(
    component({
      flexGrow: '1',
      paddingInline: space(3),
    }),
  ),
  copyButton: style(
    component({
      cursor: 'pointer',
      padding: space(2),
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { color: vars.color.warning.DEFAULT },
          },
        },
      },
    }),
  ),
};
