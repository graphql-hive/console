import { style } from '@vanilla-extract/css';
import { component } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

export const subgraphNameStyles = {
  root: style([
    shared.relative,
    shared.inlineFlex,
    shared.mono,
    shared.weight.medium,
    shared.fg.strong,
    component({
      top: '-1px',
      maxWidth: '100%',
      alignItems: 'stretch',
      borderRadius: vars.radius.sm,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.line.strong,
      backgroundColor: vars.color.surface.control,
      verticalAlign: 'middle',
      fontSize: vars.text['2xs'],
      lineHeight: '1',
    }),
  ]),
  iconCell: style([shared.row.base, component({ paddingInline: space(1) })]),
  icon: style(component({ ...square(2.5), flexShrink: '0' })),
  name: style([
    shared.shrinkable,
    shared.truncate,
    component({
      borderLeftStyle: 'solid',
      borderLeftWidth: '1px',
      borderColor: vars.color.line.strong,
      paddingInline: space(1.5),
      paddingBlock: '3px',
    }),
  ]),
};
