import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';

export const replyTicketFormStyles = {
  actions: style(
    utility({
      marginTop: space(-5),
      display: 'flex',
      flexDirection: 'row',
      columnGap: space(4),
    }),
  ),
};
