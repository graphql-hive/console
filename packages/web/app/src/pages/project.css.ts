import { style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space } from '../styles/space';
import * as shared from '../styles/shared.css';

export const projectStyles = {
  targetLink: style(
    utility({
      display: 'block',
      paddingTop: space(4),
      paddingBottom: space(5),
    }),
  ),
  header: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBlock: space(6),
    }),
  ),
  headerControls: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: space(4),
    }),
  ),
  search: style([
    shared.fullWidth,
    utility({
      '@media': {
        '(width >= 48rem)': { width: '200px' },
        '(width >= 64rem)': { width: '336px' },
      },
    }),
  ]),
  grid: style(
    utility({
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      alignItems: 'stretch',
      gap: space(5),
      '@media': {
        '(width >= 80rem)': { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
      },
    }),
  ),
  root: style(
    utility({
      display: 'flex',
      justifyContent: 'space-between',
      gap: space(12),
    }),
  ),
};
