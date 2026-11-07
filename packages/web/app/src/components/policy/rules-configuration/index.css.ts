import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { vars } from '../../../styles/theme.css';

export const rulesConfigurationStyles = {
  tooltipMarkdown: style(
    utility({
      fontSize: vars.text.sm,
      lineHeight: vars.text.smLineHeight,
    }),
  ),
};
