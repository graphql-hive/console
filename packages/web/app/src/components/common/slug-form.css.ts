import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';

export const slugFormStyles = {
  // Pulls the preview up under the input it belongs to.
  preview: style(utility({ marginTop: space(-5) })),
};
