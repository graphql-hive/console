import { globalStyle, style } from '@vanilla-extract/css';
import { component } from '../../styles/layered';
import { space, square } from '../../styles/space';
import * as shared from '../../styles/shared.css';
import { vars } from '../../styles/theme.css';

const diffToggle = style(
  component({
    marginLeft: space(2),
    display: 'flex',
    alignItems: 'center',
  }),
);

globalStyle(
  `:where(${diffToggle} > :not(:last-child))`,
  component({
    marginInlineStart: '0',
    marginInlineEnd: space(2),
  }),
);

export const diffEditorStyles = {
  toolbar: style([
    shared.row.between,
    component({
      marginBottom: space(2),
      borderBottomStyle: 'solid',
      borderBottomWidth: '1px',
      borderColor: vars.color.line.subtle,
      paddingInline: space(2),
      paddingBlock: space(1),
    }),
  ]),
  title: style(
    component({
      paddingInline: space(2),
      fontWeight: vars.weight.bold,
    }),
  ),
  actions: style([
    shared.row.base,
    component({
      marginLeft: 'auto',
      height: '36px',
      paddingInline: space(2),
    }),
  ]),
  navigateLabel: style([
    shared.text.xs,
    shared.weight.normal,
    component({ marginRight: space(2) }),
  ]),
  navigateIcon: style(component(square(4))),
  diffToggle,
  downloadIcon: style(component({ marginRight: space(2), ...square(4) })),
};
