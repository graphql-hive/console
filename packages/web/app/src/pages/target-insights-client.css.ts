import { globalStyle, style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space } from '../styles/space';
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

const sections = style(utility({ paddingBottom: space(8) }));

globalStyle(
  `:where(${sections} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(4),
  }),
);

export const targetInsightsClientStyles = {
  header: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBlock: space(6),
    }),
  ),
  headerActions: style(
    utility({
      display: 'flex',
      justifyContent: 'flex-end',
      columnGap: space(2),
    }),
  ),
  sections,
  statsRow: grid(1, 8),
  statsHalf: style(utility({ gridColumn: 'span 4 / span 4' })),
  stats: grid(4, 2),
  listsRow: grid(2, 7),
  operations: style(utility({ gridColumn: 'span 4 / span 4', display: 'grid' })),
  operation: style(
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
  ),
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
  versions: style(utility({ gridColumn: 'span 3 / span 3', display: 'grid' })),
  version: style([shared.row.base, utility({ paddingBlock: space(1) })]),
  pending: style(utility({ paddingBlock: space(8) })),
};
