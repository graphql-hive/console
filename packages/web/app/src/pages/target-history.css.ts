import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import * as shared from '../styles/shared.css';
import { vars } from '../styles/theme.css';

const actionTag = (color: string) =>
  style([
    shared.mono,
    shared.text['2xs'],
    color,
    utility({
      letterSpacing: vars.tracking.wide,
      textTransform: 'uppercase',
    }),
  ]);

const inlineIcon = style(
  utility({
    marginTop: space(0.25),
    marginRight: space(1),
    display: 'inline',
    ...square(3),
  }),
);

export const targetHistoryStyles = {
  version: recipe({
    base: utility({
      display: 'flex',
      alignItems: 'stretch',
      gap: space(3),
      borderRadius: vars.radius.lg,
      paddingBlock: space(3),
      paddingRight: space(3),
      paddingLeft: space(2),
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
  versionStatus: style(
    utility({
      marginTop: space(0.5),
      display: 'flex',
    }),
  ),
  versionTitle: style([shared.row.gap3, utility({ marginBottom: space(1), flexWrap: 'wrap' })]),
  versionId: style([
    shared.truncate,
    shared.mono,
    shared.text.xs,
    shared.weight.semibold,
    utility({ marginRight: space(1) }),
  ]),
  published: actionTag(shared.fg.success),
  removed: actionTag(shared.fg.critical),
  promoted: actionTag(shared.fg.info),
  services: style(
    utility({
      marginBottom: space(1),
      display: 'flex',
      flexWrap: 'wrap',
      gap: space(1),
    }),
  ),
  serviceIcon: inlineIcon,
  source: style([shared.flex, shared.text.xs, utility({ alignContent: 'center' })]),
  sourceIcon: inlineIcon,
  versionMeta: style([shared.stack.base, shared.noShrink]),
  versionMetaRow: style(
    utility({
      display: 'flex',
      gap: space(3),
    }),
  ),
  commit: style([
    shared.hidden,
    shared.mono,
    shared.text.xs,
    utility({
      alignItems: 'center',
      '@media': {
        '(width >= 48rem)': { display: 'flex' },
      },
    }),
  ]),
  commitIcon: style(utility({ display: 'inline' })),
  versionDate: style([
    shared.hidden,
    shared.text.xs,
    utility({
      marginTop: 'auto',
      marginBottom: '0px',
      textAlign: 'right',
      '@media': {
        '(width >= 40rem)': { display: 'block' },
      },
    }),
  ]),
  sidebar: style([
    shared.stack.base,
    utility({
      position: 'sticky',
      top: space(6),
      maxHeight: 'calc(100vh - 3rem)',
      alignSelf: 'flex-start',
    }),
  ]),
  sidebarHeader: style(utility({ paddingBlock: space(6) })),
  sidebarBody: style([
    shared.stack.base,
    shared.fill,
    utility({ minHeight: '0px', gap: space(5) }),
  ]),
  list: style([
    shared.stack.base,
    shared.grow,
    utility({
      minHeight: '0px',
      minWidth: '420px',
      borderRadius: vars.radius.md,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.line.subtle,
      backgroundColor: vars.color.surface.inset,
    }),
  ]),
  listBody: style([shared.stack.base, utility({ gap: space(2.5), padding: space(2.5) })]),
  content: style(utility({ paddingBlock: space(6) })),
  page: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      columnGap: space(6),
    }),
  ),
};
