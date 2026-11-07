import { globalStyle, style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const permissions = style(
  utility({
    display: 'flex',
    height: '400px',
    flexDirection: 'column',
  }),
);

globalStyle(
  `:where(${permissions} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(2),
  }),
);

const toggle = style(
  utility({
    marginRight: space(2),
    display: 'flex',
    alignItems: 'center',
  }),
);

globalStyle(
  `:where(${toggle} > :not(:last-child))`,
  utility({
    marginInlineStart: '0',
    marginInlineEnd: space(2),
  }),
);

export const rolesStyles = {
  permissions,
  footer: style([shared.row.gap2, utility({ justifyContent: 'flex-end' })]),
  // The "show only granted permissions" checkbox and its label.
  toggle,
  toggleLabel: style(
    utility({
      fontSize: vars.text.sm,
      lineHeight: '1',
      fontWeight: vars.weight.medium,
    }),
  ),
  creatorPermissions: style([shared.stack.base, utility({ height: '400px' })]),
  lockIcon: style(utility(square(4))),
  lockedNote: style([
    shared.stack.base,
    utility({
      alignItems: 'flex-start',
      rowGap: space(1),
      padding: space(2),
    }),
  ]),
  lockedTitle: style([shared.text.xs, shared.weight.medium]),
  lockedText: style([shared.text.xs, shared.fg.secondary]),
  defaultNote: style([
    shared.stack.base,
    utility({
      alignItems: 'flex-start',
      rowGap: space(2),
    }),
  ]),
  defaultText: style([shared.text.sm, shared.fg.secondary]),
  link: style(utility({ textDecorationLine: 'underline' })),
};
