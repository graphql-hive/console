import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';

export const graphqlEndpointFormStyles = {
  fieldRow: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(2),
    }),
  ),
  error: style([shared.text.sm, shared.fg.critical]),
};
