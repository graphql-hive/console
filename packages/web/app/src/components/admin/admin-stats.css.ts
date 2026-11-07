import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';
import { vars } from '../../styles/theme.css';

export const adminStatsStyles = {
  filters: style(
    utility({
      display: 'flex',
      justifyContent: 'space-between',
      borderRadius: vars.radius.md,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
      backgroundColor: vars.color.surface.inset,
      padding: space(5),
    }),
  ),
};
