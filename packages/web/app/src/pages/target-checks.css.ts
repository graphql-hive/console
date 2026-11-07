import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import * as shared from '../styles/shared.css';
import { vars } from '../styles/theme.css';

const sideNavRow = style(
  utility({
    display: 'flex',
    height: space(9),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  }),
);

export const targetChecksStyles = {
  pending: style([
    shared.stack.base,
    shared.fullWidth,
    shared.grow,
    utility({ marginTop: space(4), alignItems: 'center' }),
  ]),
  empty: style([
    shared.textCenter,
    shared.text.sm,
    shared.fg.secondary,
    utility({ marginBlock: space(4), cursor: 'default' }),
  ]),
  list: style([
    shared.stack.base,
    shared.grow,
    utility({
      minHeight: '0px',
      width: '300px',
      borderRadius: vars.radius.md,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.line.subtle,
    }),
  ]),
  listBody: style([shared.stack.base, utility({ gap: space(2.5), padding: space(2.5) })]),
  check: recipe({
    base: utility({
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: vars.radius.md,
      padding: space(2.5),
      '@media': {
        '(hover: hover)': {
          selectors: { '&:hover': { backgroundColor: vars.color.surface.hover } },
        },
      },
    }),
    variants: {
      selected: { true: utility({ backgroundColor: vars.color.surface.selected }) },
    },
  }),
  // The overlay keeps the whole row clickable.
  checkLink: style(
    utility({
      selectors: {
        '&::after': {
          position: 'absolute',
          inset: '0px',
          content: "''",
        },
      },
    }),
  ),
  checkTitle: style([shared.truncate, shared.text.sm, shared.weight.semibold]),
  checkSubtitle: style([
    shared.truncate,
    shared.text.xs,
    shared.weight.medium,
    shared.fg.secondary,
  ]),
  checkMeta: style([
    shared.flex,
    shared.text.xs,
    shared.weight.medium,
    shared.fg.secondary,
    utility({
      marginTop: space(2.5),
      marginBottom: space(1.5),
      verticalAlign: 'middle',
    }),
  ]),
  checkStatus: recipe({
    base: utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
    }),
    variants: {
      failed: { true: [shared.fg.critical] },
    },
  }),
  checkService: style(
    utility({
      position: 'relative',
      zIndex: '10',
      marginLeft: 'auto',
      width: '50%',
      textAlign: 'right',
      fontWeight: vars.weight.bold,
    }),
  ),
  checkGitLink: style([
    shared.relative,
    shared.text.xs,
    shared.weight.medium,
    shared.fg.secondary,
    utility({
      zIndex: '10',
      marginLeft: '-1px',
      '@media': {
        '(hover: hover)': {
          selectors: { '&:hover': { color: vars.color.fg.secondary } },
        },
      },
    }),
  ]),
  checkGitIcon: style(utility({ display: 'inline', ...square(4) })),
  sidebar: style(utility({ width: '300px', paddingBlock: space(6) })),
  sidebarPending: style([
    shared.stack.base,
    shared.fullWidth,
    shared.grow,
    utility({ marginTop: space(4), alignItems: 'center' }),
  ]),
  content: style(
    utility({
      marginBlock: space(4),
      marginTop: space(6),
      width: '100%',
      borderStyle: 'solid',
      borderWidth: '0px',
      paddingBlock: space(8),
    }),
  ),
  noChecks: style([shared.text.sm, utility({ cursor: 'default' })]),
  sideNav: style([
    shared.stack.base,
    utility({
      position: 'sticky',
      top: space(6),
      maxHeight: 'calc(100vh - 3rem)',
      gap: space(5),
      alignSelf: 'flex-start',
    }),
  ]),
  sideNavRow,
  page: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      columnGap: space(6),
    }),
  ),
};
