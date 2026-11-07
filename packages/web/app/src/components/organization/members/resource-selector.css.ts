import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

// A tab header above its pane; the tabs share the pane's border colour through `inherit`.
const tab = {
  borderTopStyle: 'solid',
  borderTopWidth: '1px',
  borderLeftStyle: 'solid',
  borderLeftWidth: '1px',
  borderColor: 'transparent',
  borderTopColor: 'inherit',
  borderLeftColor: 'inherit',
  paddingInline: space(2),
  paddingBlock: space(1),
} as const;

// A pane beside the projects pane: bordered on every side but the shared left edge.
const sidePane = style([
  shared.stack.base,
  shared.fill,
  utility({
    height: '100%',
    borderBlockStyle: 'solid',
    borderBlockWidth: '1px',
    borderRightStyle: 'solid',
    borderRightWidth: '1px',
  }),
]);

const item = style(
  utility({
    display: 'flex',
    cursor: 'pointer',
    alignItems: 'center',
    paddingInline: space(2),
    paddingBlock: space(1),
    selectors: {
      '&[data-active="true"]': {
        cursor: 'default',
        backgroundColor: vars.color.surface.inverse,
        color: vars.color.fg.inverse,
      },
    },
  }),
);

globalStyle(
  `:where(${item} > :not(:last-child))`,
  utility({
    marginInlineStart: '0',
    marginInlineEnd: space(1),
  }),
);

export const resourceSelectorStyles = {
  intro: style([shared.text.sm, utility({ marginBottom: space(4) })]),
  tabs: style([shared.flex, shared.text.sm]),
  projectsTab: style([
    shared.fill,
    shared.weight.bold,
    utility({ ...tab, borderTopLeftRadius: vars.radius.sm }),
  ]),
  targetsTab: style([shared.flex, shared.fill, utility({ ...tab, alignItems: 'baseline' })]),
  servicesTab: style([
    shared.flex,
    shared.fill,
    utility({
      ...tab,
      alignItems: 'baseline',
      borderTopRightRadius: vars.radius.sm,
      borderInlineStyle: 'solid',
      borderInlineWidth: '1px',
      borderInlineColor: 'inherit',
    }),
  ]),
  tabTitle: style([shared.row.base, shared.grow]),
  // Points down at the open section and sideways at a collapsed one.
  chevron: recipe({
    base: utility(square(4)),
    variants: {
      collapsed: {
        true: utility({ rotate: '-90deg' }),
      },
    },
  }),
  count: style([shared.text.xs, shared.weight.normal, utility({ marginLeft: space(1) })]),
  // The "All" checkbox at the end of a tab header.
  allToggle: style([shared.row.base, shared.text.xs, utility({ marginLeft: 'auto' })]),
  allLabel: style(utility({ marginRight: space(1) })),
  panes: style(
    utility({
      marginTop: '0px',
      display: 'flex',
      height: space(64),
      flexWrap: 'wrap',
      borderRadius: vars.radius.sm,
    }),
  ),
  projectsPane: style([
    shared.stack.base,
    shared.fill,
    utility({
      height: '100%',
      borderStyle: 'solid',
      borderWidth: '1px',
    }),
  ]),
  // Without the projects pane the targets pane is first, and draws the left edge itself.
  targetsPane: recipe({
    base: [sidePane],
    variants: {
      first: {
        true: utility({
          borderLeftStyle: 'solid',
          borderLeftWidth: '1px',
        }),
      },
    },
  }),
  servicesPane: sidePane,
  pane: style([shared.stack.base, utility({ paddingTop: space(2) })]),
  section: style(utility({ paddingBlock: space(2) })),
  groupLabel: style([
    shared.text.xs,
    shared.fg.secondary,
    utility({
      marginBottom: space(1),
      paddingInline: space(2),
      textTransform: 'uppercase',
    }),
  ]),
  groupLabelSpaced: style([
    shared.text.xs,
    shared.fg.secondary,
    utility({
      marginTop: space(3),
      marginBottom: space(1),
      paddingInline: space(2),
      textTransform: 'uppercase',
    }),
  ]),
  groupEmpty: style([shared.text.xs, utility({ paddingInline: space(2) })]),
  hint: style([shared.text.xs, shared.fg.secondary, utility({ paddingInline: space(2) })]),
  placeholder: style([shared.text.sm, shared.fg.secondary, utility({ paddingInline: space(2) })]),
  filter: style([
    shared.text.sm,
    utility({
      marginInline: space(2),
      marginTop: space(1),
      maxWidth: '70%',
      borderBottomStyle: 'solid',
      borderBottomWidth: '1px',
    }),
  ]),
  // The apps section sits under the services one and draws a top rule while collapsed.
  appsHeader: recipe({
    base: utility({
      display: 'flex',
      alignItems: 'baseline',
      borderBottomStyle: 'solid',
      borderBottomWidth: '1px',
      borderColor: 'transparent',
      borderBlockColor: 'inherit',
      paddingInline: space(2),
      paddingBlock: space(1),
    }),
    variants: {
      collapsed: {
        true: utility({
          borderTopStyle: 'solid',
          borderTopWidth: '1px',
        }),
      },
    },
  }),
  appsTitle: style([shared.row.base, shared.text.sm, shared.weight.bold]),
  footer: style([shared.row.base, shared.text.sm, utility({ height: space(5) })]),
  item,
  itemTitle: style([shared.grow, shared.text.sm]),
  itemChevron: style(utility({ display: 'inline' })),
  itemRemove: style(
    utility({
      color: vars.color.fg.secondary,
      selectors: {
        '&[data-active="true"]': { color: vars.color.fg.inverse },
      },
    }),
  ),
};
