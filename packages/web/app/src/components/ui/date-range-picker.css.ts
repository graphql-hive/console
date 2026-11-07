import { globalStyle, style } from '@vanilla-extract/css';
import { component } from '../../styles/layered';
import { space, square } from '../../styles/space';
import * as shared from '../../styles/shared.css';
import { vars } from '../../styles/theme.css';

const fields = style({});

globalStyle(
  `:where(${fields} > :not(:last-child))`,
  component({
    marginBlockStart: '0',
    marginBlockEnd: space(2),
  }),
);

const fieldInput = style(
  component({
    display: 'flex',
    width: '100%',
    maxWidth: vars.container.sm,
    alignItems: 'center',
  }),
);

globalStyle(
  `:where(${fieldInput} > :not(:last-child))`,
  component({
    marginInlineStart: '0',
    marginInlineEnd: space(2),
  }),
);

export const dateRangePickerStyles = {
  root: style(
    component({
      display: 'flex',
      height: '380px',
    }),
  ),
  main: style([shared.stack.base, component({ paddingBlock: space(2) })]),
  mainRow: style([
    shared.stack.gap2,
    component({
      alignItems: 'center',
      justifyContent: 'flex-end',
      '@media': {
        '(width >= 64rem)': {
          flexDirection: 'row',
          alignItems: 'flex-start',
        },
      },
    }),
  ]),
  absolute: style([shared.stack.gap1, component({ paddingLeft: space(3) })]),
  sectionTitle: style([
    shared.text.control,
    component({
      marginTop: space(1),
      marginBottom: space(2),
    }),
  ]),
  fields,
  field: style(
    component({
      display: 'grid',
      width: '100%',
      maxWidth: vars.container.sm,
      alignItems: 'center',
      gap: space(1.5),
    }),
  ),
  fieldInput,
  // Zero width with a full min-width, so a long message wraps instead of widening the panel.
  fieldError: style(
    component({
      width: '0px',
      minWidth: '100%',
      color: vars.color.critical.DEFAULT,
    }),
  ),
  footer: style(
    component({
      marginTop: 'auto',
      width: '0px',
      minWidth: '100%',
      paddingInline: space(3),
      paddingBottom: space(1),
    }),
  ),
  calendarClose: style(
    component({
      position: 'absolute',
      top: space(1),
      right: space(2),
    }),
  ),
  calendarCloseIcon: style(component(square(3))),
  presets: style([
    shared.stack.gap1,
    component({
      marginLeft: space(3),
      borderLeftStyle: 'solid',
      borderLeftWidth: '1px',
      paddingBlock: space(2),
      paddingRight: space(2),
      paddingLeft: space(3),
    }),
  ]),
  presetList: style([
    shared.stack.gap1,
    shared.fullWidth,
    component({
      alignItems: 'flex-start',
      paddingTop: space(1),
      paddingBottom: space(2),
    }),
  ]),
};
