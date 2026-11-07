import { style } from '@vanilla-extract/css';
import { utility } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import * as shared from '../../../../styles/shared.css';
import { vars } from '../../../../styles/theme.css';

export const accessTokenFormStyles = {
  generalStep: style([
    shared.stack.base,
    utility({
      maxWidth: vars.container.sm,
      gap: space(5),
    }),
  ]),
};
