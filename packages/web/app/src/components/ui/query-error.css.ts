import { style } from '@vanilla-extract/css';
import { component } from '../../styles/layered';
import { space, square } from '../../styles/space';
import * as shared from '../../styles/shared.css';
import { vars } from '../../styles/theme.css';

export const queryErrorStyles = {
  root: style([
    shared.row.base,
    shared.fullWidth,
    component({
      height: '100%',
      justifyContent: 'center',
    }),
  ]),
  signOut: style(
    component({
      position: 'absolute',
      top: space(6),
      right: space(6),
    }),
  ),
  signOutIcon: style(component({ marginRight: space(2), ...square(4) })),
  // Illustration beside the text from the `sm` breakpoint up.
  body: style([
    shared.stack.base,
    component({
      maxWidth: '960px',
      alignItems: 'center',
      columnGap: space(6),
      '@media': {
        '(width >= 40rem)': { flexDirection: 'row' },
      },
    }),
  ]),
  image: style(
    component({
      display: 'block',
      width: '200px',
      height: '200px',
    }),
  ),
  text: style([
    shared.grow,
    shared.textCenter,
    component({
      '@media': {
        '(width >= 40rem)': { textAlign: 'left' },
      },
    }),
  ]),
  title: style([shared.text.xl, shared.weight.semibold]),
  details: style(component({ marginTop: space(2) })),
  requestId: style([shared.text.xs, component({ marginTop: space(6) })]),
  requestIdRow: style([shared.inlineRow.base, shared.fg.default]),
  requestIdLabel: style(
    component({
      borderTopLeftRadius: vars.radius.sm,
      borderBottomLeftRadius: vars.radius.sm,
      backgroundColor: vars.color.warning.tint,
      padding: space(2),
    }),
  ),
  requestIdValue: style(
    component({
      borderTopRightRadius: vars.radius.sm,
      borderBottomRightRadius: vars.radius.sm,
      backgroundColor: vars.color.warning.tintSubtle,
      padding: space(2),
    }),
  ),
};
