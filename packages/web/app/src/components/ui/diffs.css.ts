import { style } from '@vanilla-extract/css';
import { component } from '../../styles/layered';

export const diffsStyles = {
  codeScrollArea: style(
    component({
      maxHeight: 'var(--code-max-h,70vh)',
      overflow: 'auto',
    }),
  ),
};
