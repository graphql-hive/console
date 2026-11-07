import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import * as shared from '../../../../styles/shared.css';
import { vars } from '../../../../styles/theme.css';

export const floatingSearchStyles = {
  // Inside a padded panel the field bleeds to the edges; a standalone one has nothing to cancel.
  root: recipe({
    base: [shared.relative],
    variants: {
      standalone: {
        true: {},
        false: component({ marginInline: space(-2) }),
      },
    },
    defaultVariants: { standalone: false },
  }),
  input: recipe({
    base: [
      shared.fullWidth,
      shared.fg.default,
      component({
        paddingBlock: space(2),
        paddingRight: space(2),
        paddingLeft: space(4),
        outlineStyle: 'none',
        selectors: {
          '&::placeholder': { color: vars.color.fg.subtle },
        },
      }),
    ],
    variants: {
      standalone: {
        // All four corners round when there is no list below to divide from.
        true: component({ borderRadius: vars.radius.md }),
        false: component({
          borderTopLeftRadius: vars.radius.md,
          borderTopRightRadius: vars.radius.md,
          borderBottomStyle: 'solid',
          borderBottomWidth: '1px',
          borderColor: vars.color.line.DEFAULT,
        }),
      },
    },
    defaultVariants: { standalone: false },
  }),
};
