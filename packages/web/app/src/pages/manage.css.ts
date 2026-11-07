import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space } from '../styles/space';
import * as shared from '../styles/shared.css';

export const manageStyles = {
  root: style(utility({ padding: space(4) })),
  title: style([shared.text.xl, shared.weight.bold, shared.fg.inverse]),
  filters: style(
    utility({
      display: 'flex',
      gap: space(4),
      paddingBottom: space(2),
    }),
  ),
  option: style(utility({ cursor: 'pointer' })),
};
