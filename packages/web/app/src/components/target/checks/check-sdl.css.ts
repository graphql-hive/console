import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

export const checkSdlStyles = {
  message: style([
    shared.row.gap2,
    shared.text.xs,
    shared.fg.secondary,
    utility({
      paddingInline: space(5),
      paddingBlock: space(3),
    }),
  ]),
  pane: style(
    utility({
      width: '100%',
      vars: { '--code-max-h': 'calc(100vh - 5rem)' },
    }),
  ),
  paneHeader: style([
    shared.row.between,
    utility({
      borderBottomStyle: 'solid',
      borderBottomWidth: '1px',
      borderColor: vars.color.line.subtle,
      paddingInline: space(2),
      paddingBlock: space(1),
    }),
  ]),
  paneTitle: style(
    utility({
      paddingInline: space(2),
      fontWeight: vars.weight.bold,
    }),
  ),
  paneActions: style([
    shared.row.base,
    utility({
      marginLeft: 'auto',
      height: '36px',
      paddingInline: space(2),
    }),
  ]),
  paneBody: style([shared.stack.base, utility({ minHeight: 'var(--code-max-h)' })]),
  state: style([
    shared.stack.gap3,
    shared.grow,
    shared.text.sm,
    shared.fg.secondary,
    utility({
      alignItems: 'center',
      justifyContent: 'center',
    }),
  ]),
};
