import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

export const invitationsStyles = {
  inviteIcon: style(utility({ marginRight: space(2) })),
  empty: style([
    shared.row.base,
    shared.noShrink,
    utility({
      height: '250px',
      justifyContent: 'center',
      borderRadius: vars.radius.md,
      borderWidth: '1px',
      borderStyle: 'dashed',
    }),
  ]),
  emptyBody: style([
    shared.stack.base,
    shared.textCenter,
    utility({
      marginInline: 'auto',
      maxWidth: '420px',
      alignItems: 'center',
      justifyContent: 'center',
    }),
  ]),
  emptyIcon: style(utility({ ...square(10), color: vars.color.fg.secondary })),
  emptyTitle: style([shared.text.lg, shared.weight.semibold, utility({ marginTop: space(4) })]),
  emptyText: style([
    shared.text.sm,
    shared.fg.secondary,
    utility({
      marginTop: space(2),
      marginBottom: space(4),
    }),
  ]),
};
