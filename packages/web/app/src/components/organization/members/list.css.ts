import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const pending = style(utility({ marginTop: space(4) }));

globalStyle(
  `:where(${pending} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(2),
  }),
);

const inline = style(utility({ display: 'inline-flex' }));

const subtleIcon = style(utility({ color: vars.color.fg.subtle }));

const smallIcon = style(utility(square(3.5)));

export const listStyles = {
  // The round status icon at the start of a row.
  status: style([
    shared.row.base,
    utility({
      ...square(9),
      justifyContent: 'center',
      borderRadius: vars.radius.full,
      backgroundColor: vars.color.surface.card,
    }),
  ]),
  statusDisabled: style([
    shared.row.base,
    shared.fg.critical,
    utility({
      ...square(9),
      justifyContent: 'center',
      borderRadius: vars.radius.full,
      backgroundColor: vars.color.critical.tint,
    }),
  ]),
  statusIcon: style(utility(square(5))),
  inline,
  icon: style(utility(square(4))),
  providerIcon: recipe({
    base: utility(square(4)),
    variants: {
      disabled: { true: [subtleIcon] },
    },
  }),
  subtleIcon,
  provisionInfo: style([shared.text.xs, shared.fg.default]),
  roleInfo: style([
    shared.inlineFlex,
    shared.fg.muted,
    utility({
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { color: vars.color.fg.default },
          },
        },
      },
    }),
  ]),
  smallIcon,
  groups: style(
    utility({
      marginRight: '0px',
      marginLeft: 'auto',
      width: 'fit-content',
    }),
  ),
  conflictIcon: style(utility({ marginRight: space(1), ...square(3) })),
  confirmText: style([shared.text.sm, shared.fg.default]),
  pending,
  pendingRow: style([shared.row.gap2, utility({ width: 'fit-content' })]),
  actions: style(
    utility({
      display: 'flex',
      justifyContent: 'flex-end',
    }),
  ),
  calloutLink: style(
    utility({
      color: vars.color.fg.inverse,
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { color: vars.color.fg.subtle },
          },
        },
      },
    }),
  ),
  table: style(utility({ marginTop: space(4) })),
  empty: style([shared.stack.gap2, utility({ alignItems: 'center' })]),
  emptyLink: style(
    utility({
      color: vars.color.accent.DEFAULT,
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { color: vars.color.accent.muted },
          },
        },
      },
    }),
  ),
};
