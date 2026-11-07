import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';

export const externalCompositionFormStyles = {
  fields: style(
    utility({
      display: 'flex',
      flexWrap: 'wrap',
      columnGap: space(24),
      rowGap: space(5),
    }),
  ),
  fieldRow: style([shared.row.gap2, shared.fullWidth]),
  error: style([shared.text.xs, shared.fg.critical]),
};
