import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space } from '../styles/space';
import * as shared from '../styles/shared.css';

export const targetAppsStyles = {
  root: style([shared.stack.base, shared.fill, utility({ paddingBlock: space(6) })]),
  table: style(utility({ marginTop: space(4) })),
};
