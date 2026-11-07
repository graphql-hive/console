import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';

export const registryTokenFormStyles = {
  actions: style(
    utility({
      display: 'flex',
      justifyContent: 'flex-end',
      gap: space(2),
    }),
  ),
};
