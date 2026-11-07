import { globalStyle, style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';
import * as shared from '../../styles/shared.css';
import { vars } from '../../styles/theme.css';

const rules = style(
  utility({
    display: 'grid',
    gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
  }),
);

globalStyle(
  `:where(${rules} > :not(:last-child))`,
  utility({
    borderBottomStyle: 'solid',
    borderTopStyle: 'solid',
    borderTopWidth: '0px',
    borderBottomWidth: '1px',
    borderColor: vars.color.line.DEFAULT,
  }),
);

export const policySettingsStyles = {
  actions: style([shared.row.base, utility({ justifyContent: 'flex-end' })]),
  dirty: style([shared.text.sm, shared.fg.secondary, utility({ paddingRight: space(2) })]),
  error: style(
    utility({
      marginInline: 'auto',
      width: '66.666667%',
    }),
  ),
  rules,
};
