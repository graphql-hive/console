import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import { vars } from '../../../styles/theme.css';

export const auditLogsFormStyles = {
  range: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      columnGap: space(8),
    }),
  ),
  rangeArrow: style(utility({ marginTop: space(2) })),
  rangeArrowIcon: style(utility({ ...square(6), color: vars.color.fg.secondary })),
  submit: style(utility({ marginTop: space(3) })),
};
