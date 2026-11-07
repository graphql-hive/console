import { globalStyle, style } from '@vanilla-extract/css';
import { utility } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import { vars } from '../../../../styles/theme.css';

const confirm = style(
  utility({
    display: 'flex',
    alignItems: 'center',
  }),
);

globalStyle(
  `:where(${confirm} > :not(:last-child))`,
  utility({
    marginInlineStart: '0',
    marginInlineEnd: space(2),
  }),
);

export const accessTokenCreatedDialogStyles = {
  confirm,
  confirmLabel: style(
    utility({
      fontSize: vars.text.sm,
      lineHeight: '1',
      fontWeight: vars.weight.medium,
    }),
  ),
};
