import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';

export const targetExplorerStyles = {
  alert: style(utility({ marginBottom: space(3) })),
  alertIcon: style(utility(square(4))),
};
