import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../../styles/layered';
import { space, square } from '../../../../styles/space';
import { vars } from '../../../../styles/theme.css';

// A line-number gutter cell.
const gutter = {
  width: '42px',
  minWidth: 'fit-content',
  backgroundColor: vars.color.surface.card,
  paddingRight: space(3),
  textAlign: 'right',
  color: vars.color.fg.subtle,
  userSelect: 'none',
  WebkitUserSelect: 'none',
} as const;

export const schemaDiffStyles = {
  table: style(
    utility({
      minWidth: '100%',
      cursor: 'default',
      fontFamily: vars.font.mono,
      fontSize: vars.text.sm,
      lineHeight: vars.text.smLineHeight,
      whiteSpace: 'pre',
      color: vars.color.fg.DEFAULT,
    }),
  ),
  // The "before" gutter is tinted for a removal and blank for an added line, and the "after"
  // gutter the other way round.
  beforeGutter: recipe({
    base: utility(gutter),
    variants: {
      removed: { true: utility({ backgroundColor: vars.color.diff.removedGutter }) },
      hidden: { true: utility({ visibility: 'hidden' }) },
    },
  }),
  afterGutter: recipe({
    base: utility(gutter),
    variants: {
      hidden: { true: utility({ visibility: 'hidden' }) },
      added: { true: utility({ backgroundColor: vars.color.diff.addedGutter }) },
    },
  }),
  content: recipe({
    base: utility({
      backgroundColor: vars.color.surface.inset,
      paddingInline: space(2),
    }),
    variants: {
      type: {
        removal: utility({ backgroundColor: vars.color.diff.removed }),
        addition: utility({ backgroundColor: vars.color.diff.added }),
        mutual: {},
      },
    },
  }),
  line: recipe({
    base: utility({ backgroundColor: vars.color.surface.inset }),
    variants: {
      type: {
        removal: utility({
          backgroundColor: vars.color.diff.removed,
          textDecorationLine: 'line-through',
          textDecorationColor: vars.color.diff.removedStrike,
        }),
        addition: utility({ backgroundColor: vars.color.diff.added }),
        mutual: {},
      },
    },
  }),
  removedIcon: style(
    utility({
      display: 'inline-block',
      color: vars.color.critical.DEFAULT,
    }),
  ),
  warningIcon: style(
    utility({
      marginRight: space(1),
      display: 'inline-block',
      ...square(4),
      color: vars.color.warning.DEFAULT,
    }),
  ),
  addedIcon: style(
    utility({
      marginRight: space(1),
      display: 'inline-block',
      color: vars.color.success.DEFAULT,
    }),
  ),
  removal: style(
    utility({
      backgroundColor: vars.color.diff.removed,
      textDecorationLine: 'line-through',
      textDecorationColor: vars.color.diff.removedStrike,
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { backgroundColor: vars.color.diff.removedHover },
          },
        },
      },
    }),
  ),
  addition: style(
    utility({
      backgroundColor: vars.color.diff.added,
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { backgroundColor: vars.color.diff.addedHover },
          },
        },
      },
    }),
  ),
};
