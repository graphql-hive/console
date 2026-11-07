import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';

export const createTargetFormStyles = {
  submit: style(utility({ marginTop: space(3) })),
};
