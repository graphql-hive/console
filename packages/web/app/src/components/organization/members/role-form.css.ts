import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';

export const roleFormStyles = {
  footer: style([shared.row.gap2, utility({ justifyContent: 'flex-end' })]),
  fields: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      gap: space(6),
    }),
  ),
  fieldsColumn: style([
    shared.stack.base,
    shared.noShrink,
    utility({
      width: space(72),
      gap: space(5),
    }),
  ]),
  permissions: style([shared.stack.base, utility({ height: '400px' })]),
};
