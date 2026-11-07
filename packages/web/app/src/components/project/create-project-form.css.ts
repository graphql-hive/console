import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../styles/layered';
import { space, square } from '../../styles/space';
import * as shared from '../../styles/shared.css';
import { vars } from '../../styles/theme.css';

export const createProjectFormStyles = {
  typeIcon: recipe({
    base: utility({ ...square(8), flexShrink: '0' }),
    variants: {
      selected: {
        true: utility({ color: vars.color.fg.DEFAULT }),
        false: utility({ color: vars.color.fg.muted }),
      },
    },
  }),
  typeTitle: style([shared.text.sm, shared.weight.medium, shared.fg.strong]),
  typeDescription: style([shared.text.sm, shared.fg.default]),
  submit: style(utility({ marginTop: space(3) })),
};
