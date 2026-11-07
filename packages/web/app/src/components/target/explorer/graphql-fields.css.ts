import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

export const graphqlFieldsStyles = {
  row: style([
    shared.flex,
    shared.fullWidth,
    utility({
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    }),
  ]),
  hint: style([shared.text.sm, shared.fg.accent, utility({ marginRight: space(1) })]),
  hintText: style([shared.text.sm, shared.fg.default]),
  name: style(utility({ fontWeight: vars.weight.semibold })),
  colon: style(utility({ marginRight: space(1) })),
  type: style(
    utility({
      fontWeight: vars.weight.semibold,
      color: vars.color.fg.default,
    }),
  ),
  meta: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
    }),
  ),
  metaItem: style(utility({ marginLeft: space(1) })),
};
