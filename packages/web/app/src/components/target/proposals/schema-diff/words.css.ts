import { styleVariants } from '@vanilla-extract/css';
import { utility } from '../../../../styles/layered';
import { vars } from '../../../../styles/theme.css';

// Syntax colours for a rendered SDL diff, keyed by the kind of token.
export const wordsStyles = {
  word: styleVariants({
    description: utility({ color: vars.color.fg.subtle }),
    field: utility({ color: vars.color.fg.default }),
    keyword: utility({ color: vars.color.fg.secondary }),
    literal: utility({ color: vars.color.fg.default }),
    location: utility({ color: vars.color.warning.DEFAULT }),
    type: utility({ color: vars.color.warning.DEFAULT }),
  }),
};
