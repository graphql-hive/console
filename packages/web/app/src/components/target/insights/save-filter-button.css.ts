import { globalStyle, style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';

const form = style({});

globalStyle(
  `:where(${form} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(3),
  }),
);

export const saveFilterButtonStyles = {
  actions: style([shared.row.base, utility({ columnGap: space(2) })]),
  form,
};
