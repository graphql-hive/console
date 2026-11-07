import { globalStyle, style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space } from '../styles/space';
import * as shared from '../styles/shared.css';
import { vars } from '../styles/theme.css';

const sections = style({});

globalStyle(
  `:where(${sections} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(12),
  }),
);

export const targetSettingsStyles = {
  tokensActions: style(
    utility({
      marginBlock: space(3.5),
      display: 'flex',
      justifyContent: 'flex-end',
    }),
  ),
  baseSchemaActions: style([shared.row.base, utility({ columnGap: space(3) })]),
  unsaved: style([shared.text.sm, shared.fg.success]),
  exclusionError: style([shared.text.sm, shared.fg.critical]),
  breakingChangesError: style(
    utility({
      marginLeft: space(2),
      color: vars.color.critical.DEFAULT,
    }),
  ),
  command: style([
    shared.text.xs,
    utility({
      borderRadius: vars.radius.sm,
      backgroundColor: vars.color.surface.code,
      paddingInline: space(1),
      paddingBlock: space(0.5),
    }),
  ]),
  sections,
};
