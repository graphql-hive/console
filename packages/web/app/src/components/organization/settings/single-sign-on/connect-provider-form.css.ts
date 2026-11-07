import { style } from '@vanilla-extract/css';
import { utility } from '../../../../styles/layered';
import { space } from '../../../../styles/space';

export const connectProviderFormStyles = {
  metadataUrlRow: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      columnGap: space(4),
    }),
  ),
};
