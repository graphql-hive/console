import { globalStyle, style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const operations = style(
  utility({
    color: vars.color.fg.subtle,
    transitionProperty: 'opacity',
    transitionDuration: '700ms',
    transitionTimingFunction: vars.ease.inOut,
  }),
);

globalStyle(
  `:where(${operations} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(12),
  }),
);

export const statsStyles = {
  clients: style(
    utility({
      marginTop: space(5),
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      columnGap: space(4),
    }),
  ),
  clientsChart: style(utility({ marginTop: space(5) })),
  clientsToggle: style([shared.fullWidth, shared.textCenter, utility({ marginTop: space(5) })]),
  clientsToggleIcon: style(utility({ marginRight: space(2), ...square(4) })),
  operations,
  operationsGrid: style(
    utility({
      display: 'grid',
      gap: space(4),
      '@media': {
        '(width >= 48rem)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
        '(width >= 64rem)': { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' },
      },
    }),
  ),
};
