import { globalStyle, style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space, square } from '../../styles/space';
import * as shared from '../../styles/shared.css';
import { vars } from '../../styles/theme.css';

// The rule's configuration boxes, divided by rules.
const config = style(
  utility({
    display: 'grid',
    flexGrow: '1',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    verticalAlign: 'middle',
  }),
);

globalStyle(
  `${config} > *`,
  utility({
    minHeight: '40px',
    borderLeftStyle: 'solid',
    borderLeftWidth: '1px',
    borderLeftColor: vars.color.line.DEFAULT,
  }),
);

export const policyListItemStyles = {
  root: style(
    utility({
      paddingInline: space(1),
      paddingBlock: space(4),
    }),
  ),
  row: style(
    utility({
      display: 'flex',
      columnGap: space(4),
    }),
  ),
  checkbox: style(utility({ paddingTop: '2px' })),
  header: style(utility({ marginBottom: space(2) })),
  label: style([shared.mono, shared.text.sm, shared.weight.medium]),
  hint: style(
    utility({
      marginLeft: space(2),
      display: 'inline-block',
      verticalAlign: 'middle',
      color: vars.color.accent.DEFAULT,
    }),
  ),
  hintIcon: style(utility(square(4))),
  hintMarkdown: style(
    utility({
      fontSize: vars.text.sm,
      lineHeight: vars.text.smLineHeight,
    }),
  ),
  settings: style([shared.flex, shared.fullWidth]),
  config,
  override: style([
    shared.text.xs,
    shared.weight.medium,
    shared.fg.secondary,
    utility({ marginTop: space(4) }),
  ]),
  overrideMark: style([
    shared.text.sm,
    shared.weight.medium,
    shared.fg.accent,
    utility({
      marginRight: space(2),
      display: 'inline-block',
    }),
  ]),
};
