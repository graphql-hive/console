import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

export const transferOwnershipDialogStyles = {
  body: style([shared.stack.base, utility({ gap: space(5) })]),
  rule: style(
    utility({
      height: '0px',
      width: '100%',
      borderTopStyle: 'solid',
      borderTopWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
    }),
  ),
  notes: style([
    shared.text.sm,
    shared.fg.default,
    utility({
      listStylePosition: 'inside',
      listStyleType: 'disc',
      paddingInline: space(2),
    }),
  ]),
  note: style(utility({ paddingTop: space(3) })),
};
