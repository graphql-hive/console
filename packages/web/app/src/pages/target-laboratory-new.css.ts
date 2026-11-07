import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import * as shared from '../styles/shared.css';
import { palette, vars } from '../styles/theme.css';

export const targetLaboratoryNewStyles = {
  root: style([
    shared.stack.gap3,
    shared.fullWidth,
    utility({ height: '100%', paddingBlock: space(6) }),
  ]),
  divider: style(
    utility({
      height: space(4),
      width: '1px',
      backgroundColor: vars.color.line.DEFAULT,
    }),
  ),
  unsavedDot: style(
    utility({
      marginLeft: space(1),
      ...square(2),
      borderRadius: vars.radius.full,
      backgroundColor: vars.color.accent.DEFAULT,
    }),
  ),
  toolbarEnd: style([
    shared.stack.base,
    utility({ marginRight: '0px', marginLeft: 'auto', justifyContent: 'center' }),
  ]),
  queryLabelRow: style(utility({ alignSelf: 'flex-end', paddingTop: space(2) })),
  queryLabel: style([shared.text.xs, shared.weight.bold, utility({ marginRight: space(2) })]),
  editor: style(
    utility({
      flex: '1',
      overflow: 'hidden',
      borderRadius: vars.radius.lg,
      borderStyle: 'solid',
      borderWidth: '1px',
    }),
  ),
  note: style([shared.text.sm, shared.fg.default]),
  page: style(
    utility({
      display: 'flex',
      height: palette.layout.contentHeight,
      flexDirection: 'column',
      paddingBottom: '0px',
    }),
  ),
};
