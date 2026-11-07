import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';
import * as utilities from '../../styles/utilities.css';

export const projectLayoutStyles = {
  createIcon: style(utility({ marginRight: space(2) })),
  container: utilities.container,
};
