import { globalStyle, style } from '@vanilla-extract/css';
import { utility } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import { vars } from '../../../../styles/theme.css';

const root = style(
  utility({
    maxWidth: '800px',
    color: vars.color.fg.secondary,
  }),
);

globalStyle(
  `:where(${root} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(4),
  }),
);

export const singleSignOnSubpageStyles = {
  root,
  connect: style(utility({ marginTop: space(5) })),
  connectIcon: style(utility({ marginRight: space(2) })),
};
