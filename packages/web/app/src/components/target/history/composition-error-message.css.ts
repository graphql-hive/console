import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

export const compositionErrorMessageStyles = {
  root: style([
    shared.shrinkable,
    shared.text.sm,
    shared.fg.strong,
    utility({ whiteSpace: 'pre-wrap' }),
  ]),
  block: style(
    utility({
      marginBlock: space(2),
      overflowX: 'auto',
      borderRadius: vars.radius.md,
      borderStyle: 'solid',
      borderWidth: '1px',
      backgroundColor: vars.color.surface.inset,
      paddingInline: space(3),
      paddingBlock: space(2),
      fontFamily: vars.font.mono,
      fontSize: vars.text.xs,
      lineHeight: space(5),
      whiteSpace: 'pre',
    }),
  ),
  bullet: style(
    utility({
      width: '1em',
      flexShrink: '0',
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }),
  ),
};
