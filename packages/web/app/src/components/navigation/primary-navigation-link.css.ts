import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { vars } from '../../styles/theme.css';

export const primaryNavigationLinkStyles = {
  root: style(
    utility({
      maxWidth: '200px',
      flexShrink: '0',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      fontSize: vars.text.sm,
      lineHeight: vars.text.smLineHeight,
      fontWeight: vars.weight.medium,
      color: vars.color.fg.default,
    }),
  ),
};
