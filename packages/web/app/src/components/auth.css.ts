import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space } from '../styles/space';
import * as shared from '../styles/shared.css';
import { vars } from '../styles/theme.css';

export const authStyles = {
  stack: style(
    utility({
      display: 'grid',
      rowGap: space(4),
    }),
  ),
  separator: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      columnGap: space(4),
    }),
  ),
  separatorLine: style(
    utility({
      height: '1px',
      width: '100%',
      backgroundColor: vars.color.line.subtle,
    }),
  ),
  separatorLabel: style([shared.textCenter, shared.fg.muted]),
  card: style(
    utility({
      marginInline: 'auto',
      width: '100%',
      '@media': {
        '(width >= 48rem)': { maxWidth: vars.container.md },
      },
    }),
  ),
};
