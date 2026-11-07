import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';
import { vars } from '../../../styles/theme.css';

export const graphqlArgumentsStyles = {
  root: style(
    utility({
      marginLeft: space(1),
      color: vars.color.fg.secondary,
    }),
  ),
  list: style(
    utility({
      paddingLeft: space(4),
      color: vars.color.fg.default,
    }),
  ),
  type: style(utility({ fontWeight: vars.weight.medium })),
};
