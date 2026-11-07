import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const operations = style(
  utility({
    paddingBottom: space(2),
    paddingLeft: space(2),
  }),
);

globalStyle(
  `:where(${operations} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: '0',
  }),
);

export const operationCollectionsPluginStyles = {
  collection: style([shared.inlineRow.base, utility({ columnGap: space(3) })]),
  icon: style(utility(square(4))),
  operations,
  // The open operation is highlighted; `changed` anchors the unsaved-changes badge.
  operation: recipe({
    base: utility({
      display: 'flex',
      width: '100%',
      alignItems: 'center',
      columnGap: space(3),
      borderRadius: vars.radius.sm,
      padding: space(2),
      fontWeight: vars.weight.normal,
      color: vars.color.fg.muted,
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': {
              backgroundColor: vars.color.surface.hover,
              color: vars.color.fg.DEFAULT,
              textDecorationLine: 'none',
            },
          },
        },
      },
    }),
    variants: {
      active: {
        true: utility({
          backgroundColor: vars.color.surface.selected,
          color: vars.color.fg.DEFAULT,
        }),
      },
      changed: {
        true: utility({ position: 'relative' }),
      },
    },
  }),
  // Shown while the row is hovered.
  operationMenu: style(
    utility({
      color: vars.color.fg.DEFAULT,
      opacity: '0%',
      transitionProperty: 'opacity',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: vars.transition.duration,
      selectors: {
        'div:hover > &': { opacity: '100%' },
      },
    }),
  ),
  addIcon: style(utility({ marginRight: space(1), display: 'inline', ...square(4) })),
  header: style([
    shared.row.gap1,
    utility({ marginBottom: space(5), justifyContent: 'space-between' }),
  ]),
  headerTitle: style([shared.flex, shared.shrinkable]),
  newCollection: style([shared.row.gap1, shared.shrinkable]),
  newCollectionIcon: style(utility({ ...square(4), flexShrink: '0' })),
  skeleton: style([shared.stack.gap3, utility({ paddingInline: space(2) })]),
  empty: style([
    shared.row.base,
    shared.fill,
    utility({ height: 'fit-content', justifyContent: 'center' }),
  ]),
  emptyBody: style([shared.stack.base, utility({ alignItems: 'center' })]),
  emptyText: style([shared.text.xs, utility({ marginTop: space(2) })]),
  emptyAction: style(utility({ marginTop: space(3) })),
};
