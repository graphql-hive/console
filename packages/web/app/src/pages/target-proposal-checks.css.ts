import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import * as shared from '../styles/shared.css';
import { vars } from '../styles/theme.css';

export const targetProposalChecksStyles = {
  list: style(
    utility({
      display: 'grid',
      width: '100%',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      alignContent: 'space-evenly',
      '@media': {
        '(width >= 40rem)': { gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' },
      },
    }),
  ),
  striped: style(utility({ backgroundColor: vars.color.surface.stripe })),
  check: style(
    utility({
      gridColumn: 'span 3 / span 3',
      display: 'grid',
      gridTemplateColumns: 'subgrid',
      alignItems: 'center',
      gap: space(4),
      paddingInline: space(4),
      paddingBlock: space(3),
      textAlign: 'left',
      fontSize: vars.text.base,
      lineHeight: vars.text.baseLineHeight,
      '@media': {
        '(hover: hover)': {
          selectors: { '&:hover': { backgroundColor: vars.color.surface.hover } },
        },
        '(width >= 40rem)': { gridColumn: 'span 5 / span 5' },
      },
    }),
  ),
  checkStatus: style(
    utility({
      gridRow: 'span 2 / span 2',
      '@media': {
        '(width >= 40rem)': { gridRow: 'span 1 / span 1' },
      },
    }),
  ),
  checkService: style([shared.truncate, utility({ minWidth: '100px' })]),
  checkServiceName: style([shared.row.base, shared.text.base, shared.weight.semibold]),
  checkServiceIcon: style(utility({ marginRight: space(1), ...square(3) })),
  checkCommit: style([shared.truncate, shared.textCenter, shared.fg.secondary]),
  checkDate: style([
    shared.row.base,
    utility({
      gridColumnStart: '2',
      '@media': {
        '(width >= 40rem)': { gridColumnStart: '4', justifySelf: 'flex-end' },
      },
    }),
  ]),
  checkDateIcon: style(utility({ height: space(3) })),
  checkAuthor: style([
    shared.truncate,
    shared.fg.secondary,
    utility({ paddingRight: space(4), textAlign: 'right' }),
  ]),
  statusFailed: style([shared.row.base, shared.fg.critical]),
  statusPassed: style([shared.row.base, shared.fg.success]),
  statusIcon: style(utility({ display: 'inline-block', height: space(4) })),
  statusUnchanged: style([shared.row.base, shared.fg.secondary]),
  statusUnchangedIcon: style(utility({ marginRight: space(2), ...square(4) })),
};
