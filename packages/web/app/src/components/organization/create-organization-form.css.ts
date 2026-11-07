import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';
import * as shared from '../../styles/shared.css';
import * as utilities from '../../styles/utilities.css';

export const createOrganizationFormStyles = {
  root: style([
    utilities.container,
    utility({
      width: '80%',
      maxWidth: '520px',
      '@media': {
        '(width >= 48rem)': { width: '60%' },
      },
    }),
  ]),
  actions: style([shared.row.base, utility({ marginTop: space(6) })]),
};
