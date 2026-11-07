import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import * as shared from '../styles/shared.css';
import { vars } from '../styles/theme.css';

const grid = (md: number, lg: number) =>
  style(
    utility({
      display: 'grid',
      gap: space(4),
      '@media': {
        '(width >= 48rem)': { gridTemplateColumns: `repeat(${md}, minmax(0, 1fr))` },
        '(width >= 64rem)': { gridTemplateColumns: `repeat(${lg}, minmax(0, 1fr))` },
      },
    }),
  );

const spaced = (gap: number, rule = {}) => {
  const root = style(utility(rule));
  globalStyle(
    `:where(${root} > :not(:last-child))`,
    utility({
      marginBlockStart: '0',
      marginBlockEnd: space(gap),
    }),
  );
  return root;
};

const listLink = style(
  utility({
    display: 'flex',
    alignItems: 'center',
    borderRadius: vars.radius.md,
    paddingInline: space(2),
    paddingBlock: space(1),
    color: vars.color.fg.default,
    '@media': {
      '(hover: hover)': {
        selectors: {
          '&:hover': {
            backgroundColor: vars.color.surface.hover,
            color: vars.color.fg.default,
            textDecorationLine: 'underline',
            textUnderlineOffset: '2px',
          },
        },
      },
    },
  }),
);

export const targetInsightsCoordinateStyles = {
  header: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBlock: space(6),
    }),
  ),
  headerTitle: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    }),
  ),
  title: style(utility({ paddingRight: space(8) })),
  headerActions: style(
    utility({
      display: 'flex',
      justifyContent: 'flex-end',
      columnGap: space(2),
    }),
  ),
  notice: style(utility({ paddingBottom: space(8) })),
  noticeIcon: style(utility(square(4))),
  infoAlert: style(
    utility({
      borderColor: vars.color.info.lineSubtle,
      backgroundColor: vars.color.info.tintSubtle,
      color: vars.color.info.DEFAULT,
    }),
  ),
  sections: spaced(4, { paddingBottom: space(8) }),
  statsRow: grid(1, 8),
  statsHalf: style(utility({ gridColumn: 'span 4 / span 4' })),
  stats: grid(4, 2),
  statNote: style(utility({ marginBottom: space(2) })),
  statWarning: style([
    shared.text.sm,
    shared.weight.normal,
    shared.fg.critical,
    utility({ marginLeft: space(2) }),
  ]),
  // Field-level metrics, hidden until the toggle opens them.
  fieldMetrics: recipe({
    base: utility({ paddingTop: space(5) }),
    variants: {
      hidden: { true: [shared.hidden] },
    },
  }),
  fieldMetricsNote: style([
    shared.text.control,
    shared.fg.secondary,
    utility({ paddingBottom: space(4) }),
  ]),
  listsRow: grid(2, 7),
  operations: style(utility({ gridColumn: 'span 4 / span 4', display: 'grid' })),
  listLink,
  name: style([shared.truncate, shared.text.sm, shared.weight.medium]),
  figures: style([
    shared.flex,
    shared.text.sm,
    utility({
      marginLeft: 'auto',
      minWidth: '150px',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      fontWeight: vars.weight.light,
    }),
  ]),
  figure: style(utility({ minWidth: '70px', textAlign: 'right' })),
  clients: style(utility({ gridColumn: 'span 3 / span 3', display: 'grid' })),
  errors: spaced(2),
  pending: style(utility({ paddingBlock: space(8) })),
};
