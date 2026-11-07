import { globalStyle, style } from '@vanilla-extract/css';
import { utility } from '../../../../styles/layered';
import { space } from '../../../../styles/space';

const root = style(utility({ marginBlock: space(3.5) }));

globalStyle(
  `:where(${root} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(4),
  }),
);

export const personalAccessTokensSubPageStyles = { root };
