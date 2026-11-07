import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';

export const invitationFormStyles = {
  fields: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space(6),
    }),
  ),
  actions: style(
    utility({
      display: 'flex',
      justifyContent: 'flex-end',
    }),
  ),
};
