import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../styles/layered';
import { vars } from '../../../styles/theme.css';

export const namingConventionRuleEditorStyles = {
  root: style(utility({ gridColumn: 'span 4 / span 4' })),
  editor: recipe({
    base: utility({
      borderRadius: vars.radius.md,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: 'transparent',
    }),
    variants: {
      invalid: {
        true: utility({ borderColor: vars.color.critical.DEFAULT }),
      },
    },
  }),
};
