import { globalStyle, style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const rows = style({});

globalStyle(
  `:where(${rows} > :not(:last-child))`,
  utility({
    borderBottomStyle: 'solid',
    borderTopStyle: 'solid',
    borderTopWidth: '0px',
    borderBottomWidth: '1px',
  }),
);

const mappings = style({});

globalStyle(
  `:where(${mappings} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(2),
  }),
);

// Plain so the mapping's actions can key their visibility off `mapping:hover`.
const mapping = style([
  shared.row.between,
  utility({
    borderRadius: vars.radius.md,
    backgroundColor: vars.color.surface.card,
    paddingInline: space(3),
    paddingBlock: space(1.5),
  }),
]);

const gridRow = {
  display: 'grid',
  gridTemplateColumns: '1fr auto auto',
  gap: space(4),
  paddingInline: space(4),
  paddingBlock: space(3),
} as const;

const transition = {
  transitionProperty:
    'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
  transitionTimingFunction: vars.transition.timing,
  transitionDuration: vars.transition.duration,
} as const;

export const groupsStyles = {
  search: style(utility({ width: space(56) })),
  table: style(
    utility({
      marginTop: space(4),
      overflow: 'hidden',
      borderRadius: vars.radius.lg,
      borderStyle: 'solid',
      borderWidth: '1px',
    }),
  ),
  tableHeader: style([
    shared.text.sm,
    shared.weight.medium,
    utility({
      ...gridRow,
      borderBottomStyle: 'solid',
      borderBottomWidth: '1px',
      backgroundColor: vars.color.surface.card,
    }),
  ]),
  membersColumn: style(
    utility({
      width: space(24),
      textAlign: 'center',
    }),
  ),
  actionsColumn: style(utility({ width: space(10) })),
  rows,
  skeletonRow: style(utility({ ...gridRow, alignItems: 'center' })),
  skeletonToggle: style([shared.icon.md, utility({ display: 'block' })]),
  skeletonName: style(utility({ display: 'flex', width: space(32) })),
  skeletonBadge: style(utility({ display: 'flex', width: space(28) })),
  skeletonMembers: style(
    utility({
      display: 'flex',
      width: space(24),
      justifyContent: 'center',
    }),
  ),
  skeletonCount: style(utility({ display: 'flex', width: space(6) })),
  empty: style([
    shared.stack.base,
    shared.textCenter,
    utility({
      alignItems: 'center',
      justifyContent: 'center',
      paddingInline: space(6),
      paddingBlock: space(16),
    }),
  ]),
  emptyTitle: style([shared.text.base, shared.weight.semibold]),
  emptyText: style(
    utility({
      marginTop: space(2),
      maxWidth: vars.container.md,
      fontSize: vars.text.sm,
      lineHeight: space(6),
    }),
  ),
  loadMore: style(
    utility({
      paddingInline: space(4),
      paddingBlock: space(3),
    }),
  ),
  note: style([shared.text.xs, utility({ marginTop: space(4) })]),
  // A group row, expandable to its role mappings.
  row: style(
    utility({
      ...gridRow,
      cursor: 'pointer',
      alignItems: 'center',
      ...transition,
    }),
  ),
  toggle: style(
    utility({
      borderRadius: vars.radius.sm,
      padding: space(0.5),
      ...transition,
    }),
  ),
  icon: style(utility(square(4))),
  avatar: style([
    shared.row.base,
    utility({
      ...square(9),
      justifyContent: 'center',
      borderRadius: vars.radius.full,
    }),
  ]),
  name: style([shared.text.sm, shared.weight.medium]),
  rowActions: style(utility({ width: space(8) })),
  details: style(
    utility({
      borderTopStyle: 'solid',
      borderTopWidth: '1px',
      borderColor: vars.color.line.subtle,
    }),
  ),
  detailsBody: style(
    utility({
      paddingInline: space(4),
      paddingBlock: space(2),
      paddingLeft: space(16),
    }),
  ),
  detailsTitle: style([shared.text.xs, shared.weight.medium, utility({ marginBottom: space(2) })]),
  mappings,
  addMapping: style([
    shared.row.gap1_5,
    shared.text.xs,
    shared.fg.warning,
    utility({
      paddingBlock: space(1),
      ...transition,
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { color: vars.color.warning.DEFAULT },
          },
        },
      },
    }),
  ]),
  smallIcon: style(utility(square(3))),
  mapping,
  mappingActions: style([
    shared.row.gap1,
    utility({
      opacity: '0%',
      transitionProperty: 'opacity',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: vars.transition.duration,
      '@media': {
        '(hover: hover)': {
          selectors: {
            [`${mapping}:hover &`]: { opacity: '100%' },
          },
        },
      },
    }),
  ]),
};
