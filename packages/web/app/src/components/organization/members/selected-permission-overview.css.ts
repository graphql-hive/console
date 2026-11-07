import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';

export const selectedPermissionOverviewStyles = {
  groups: style(
    utility({
      marginLeft: space(1),
      display: 'flex',
      maxWidth: '800px',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      overflowX: 'auto',
    }),
  ),
  group: style(
    utility({
      width: '50%',
      minWidth: '400px',
      paddingRight: space(12),
      paddingBottom: space(4),
    }),
  ),
};
