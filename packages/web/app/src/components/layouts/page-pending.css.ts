import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';
import * as shared from '../../styles/shared.css';

export const pagePendingStyles = {
  page: style(
    utility({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }),
  ),
  section: style([
    shared.row.base,
    shared.grow,
    utility({
      justifyContent: 'center',
      alignSelf: 'center',
      paddingBlock: space(24),
    }),
  ]),
};
