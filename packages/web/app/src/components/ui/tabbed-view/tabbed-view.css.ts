import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../styles/layered';
import { space } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

export const tabbedViewStyles = {
  root: style(
    component({
      overflow: 'hidden',
      borderRadius: vars.radius.md,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
      backgroundColor: vars.color.neutral[1],
      selectors: {
        '&:where(.dark, .dark *)': { backgroundColor: vars.color.neutral[2] },
      },
    }),
  ),
  header: style([
    shared.row.base,
    component({
      borderBottomStyle: 'solid',
      borderBottomWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
      backgroundColor: vars.color.surface.card,
    }),
  ]),
  // Hides the outgoing panel the moment it starts ending, as the tabs primitive does.
  panel: recipe({
    base: component({
      outlineStyle: 'none',
      selectors: {
        '&[data-ending-style]': { display: 'none' },
      },
    }),
    variants: {
      bodyPadding: {
        default: component({ padding: space(5) }),
        none: {},
      },
    },
  }),
};
