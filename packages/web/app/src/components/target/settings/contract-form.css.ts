import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

export const contractFormStyles = {
  suggestions: style(
    utility({
      width: '200px',
      padding: space(1),
    }),
  ),
  suggestionsTitle: style([
    shared.text.xs,
    shared.weight.medium,
    shared.fg.secondary,
    utility({
      paddingInline: space(2),
      paddingBlock: space(1.5),
    }),
  ]),
  suggestion: style(
    utility({
      width: '100%',
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': {
              backgroundColor: vars.color.surface.hover,
              color: vars.color.fg.DEFAULT,
            },
          },
        },
      },
    }),
  ),
  // The check keeps its space so the labels line up; it only shows for a selected tag.
  suggestionCheck: recipe({
    base: utility({ marginRight: space(2), ...square(4) }),
    variants: {
      selected: {
        true: utility({ opacity: '100%' }),
        false: utility({ opacity: '0%' }),
      },
    },
  }),
  tagsField: style([shared.row.gap2, shared.fullWidth, utility({ maxWidth: vars.container.sm })]),
  tags: style([
    shared.flex,
    shared.fill,
    utility({
      flexWrap: 'wrap',
      gap: space(1),
      paddingLeft: space(3),
    }),
  ]),
  tagRemoveIcon: style(utility(square(3))),
  switchRow: style([shared.row.gap2, utility({ paddingLeft: space(1) })]),
};
