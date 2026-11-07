import { globalStyle, style, styleVariants } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const root = style({});

globalStyle(
  `:where(${root} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(2),
  }),
);

export const alertStateTransitionsBarStyles = {
  root,
  bar: style([
    shared.flex,
    shared.fullWidth,
    utility({
      height: space(4),
      overflow: 'hidden',
      borderRadius: vars.radius.sm,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
    }),
  ]),
  segment: style(utility({ height: '100%' })),
  // A segment's fill, by the state the rule was in.
  state: styleVariants({
    normal: utility({ backgroundColor: vars.color.success.DEFAULT }),
    pending: utility({ backgroundColor: vars.color.warning.DEFAULT }),
    firing: utility({ backgroundColor: vars.color.critical.DEFAULT }),
    recovering: utility({ backgroundColor: vars.color.info.DEFAULT }),
    noData: utility({ backgroundColor: vars.color.line.strong }),
  }),
  tooltipState: style([shared.weight.medium, shared.fg.strong]),
  ticks: style([
    shared.flex,
    shared.fg.secondary,
    utility({
      justifyContent: 'space-between',
      fontSize: '11px',
    }),
  ]),
};
