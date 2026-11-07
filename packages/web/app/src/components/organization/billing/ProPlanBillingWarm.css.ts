import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';

export const proPlanBillingWarmStyles = {
  callout: style(
    utility({
      marginBottom: space(2),
      width: '100%',
    }),
  ),
};
