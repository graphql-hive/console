import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space } from '../styles/space';

export const organizationMembersStyles = {
  root: style(
    utility({
      display: 'flex',
      flexDirection: 'column',
      rowGap: space(10),
    }),
  ),
  pending: style(
    utility({
      display: 'flex',
      justifyContent: 'center',
      paddingBlock: space(12),
    }),
  ),
};
