import { style } from '@vanilla-extract/css';
import { component } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const bar = style(
  component({
    display: 'flex',
    height: space(9),
    width: '100%',
    alignItems: 'center',
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
    borderColor: vars.color.line.subtle,
    backgroundColor: vars.color.surface.card,
    fontSize: vars.text.sm,
    lineHeight: vars.text.smLineHeight,
  }),
);

const control = {
  color: vars.color.fg.secondary,
  transitionProperty:
    'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
  transitionTimingFunction: vars.transition.timing,
  transitionDuration: vars.transition.duration,
  selectors: {
    '&:disabled': { opacity: '40%' },
  },
  '@media': {
    '(hover: hover)': {
      selectors: {
        '&:hover': { color: vars.color.fg.DEFAULT },
        '&:disabled:hover': { color: vars.color.fg.secondary },
      },
    },
  },
} as const;

export const dataTablePaginationStyles = {
  // Page-number pagination: arrows and first/last words around the current page.
  pageNav: style([
    bar,
    component({
      justifyContent: 'center',
      gap: space(1),
    }),
  ]),
  arrow: style(
    component({
      display: 'inline-flex',
      ...square(8),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: vars.radius.md,
      ...control,
    }),
  ),
  word: style(
    component({
      display: 'inline-flex',
      height: space(8),
      alignItems: 'center',
      borderRadius: vars.radius.md,
      paddingInline: space(2),
      fontSize: vars.text.xs,
      lineHeight: vars.text.xsLineHeight,
      ...control,
    }),
  ),
  icon: style(component(square(4))),
  page: style([
    shared.mono,
    shared.text.xs,
    shared.fg.strong,
    shared.tabularNums,
    component({ paddingInline: space(2) }),
  ]),
  pageSize: style([
    shared.inlineRow.gap2,
    shared.text.xs,
    shared.fg.secondary,
    component({ marginLeft: space(4) }),
  ]),
  // Cursor pagination: a summary on the left, arrows on the right.
  cursorNav: style([
    bar,
    component({
      justifyContent: 'space-between',
      paddingInline: space(2),
    }),
  ]),
  cursorSummary: style([
    shared.text.xs,
    shared.fg.secondary,
    component({ paddingInline: space(2) }),
  ]),
};
