import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';

export const schemaContractsStyles = {
  header: style(
    utility({
      marginBlock: space(3.5),
      display: 'flex',
      justifyContent: 'space-between',
    }),
  ),
};
