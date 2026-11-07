import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';
import { vars } from '../../styles/theme.css';

export const legacyCompositionWarnStyles = {
  callout: style(
    utility({
      marginBottom: space(2),
      width: '100%',
    }),
  ),
  link: style(utility({ color: vars.color.info.DEFAULT })),
};
