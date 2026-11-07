import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space } from '../styles/space';

export const targetAlertsActivityStyles = {
  section: style(utility({ marginTop: space(6) })),
};
