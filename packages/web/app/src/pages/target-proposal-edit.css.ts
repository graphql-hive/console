import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import * as shared from '../styles/shared.css';

export const targetProposalEditStyles = {
  root: style([shared.relative, shared.fullWidth, utility({ minHeight: '500px' })]),
  actions: style([
    shared.row.base,
    utility({
      position: 'absolute',
      top: '0px',
      right: space(1),
    }),
  ]),
  status: style(
    utility({
      marginRight: space(1),
      display: 'inline-flex',
    }),
  ),
  saveIcon: style(utility({ marginRight: space(1), ...square(4) })),
};
