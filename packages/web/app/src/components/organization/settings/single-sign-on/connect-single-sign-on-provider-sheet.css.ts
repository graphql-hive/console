import { globalStyle, style } from '@vanilla-extract/css';
import { utility } from '../../../../styles/layered';
import { space } from '../../../../styles/space';

const body = style({});

globalStyle(
  `:where(${body} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(4),
  }),
);

export const connectSingleSignOnProviderSheetStyles = { body };
