import { globalStyle, style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space } from '../styles/space';
import * as shared from '../styles/shared.css';

const sections = style({});

globalStyle(
  `:where(${sections} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(12),
  }),
);

export const organizationSettingsStyles = {
  root: style(
    utility({
      display: 'flex',
      flexDirection: 'column',
      rowGap: space(10),
    }),
  ),
  sections,
  integrationActions: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      gap: space(3),
    }),
  ),
  integrationIcon: style(utility({ marginRight: space(2) })),
  policyOverride: style([
    shared.row.base,
    utility({ paddingTop: space(2), paddingLeft: space(1) }),
  ]),
  policyOverrideLabel: style([
    shared.text.sm,
    shared.fg.default,
    utility({ marginLeft: space(2), display: 'inline-block' }),
  ]),
};
