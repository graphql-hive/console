import { globalStyle, style } from '@vanilla-extract/css';
import { focusRing } from '../../components/ui/primitives/shared-styles';
import { utility } from '../../styles/layered';
import { space, square } from '../../styles/space';
import * as shared from '../../styles/shared.css';
import { vars } from '../../styles/theme.css';

const spacedRow = style(
  utility({
    marginTop: space(4),
    display: 'flex',
    width: '100%',
    maxWidth: vars.container.sm,
    alignItems: 'center',
  }),
);

globalStyle(
  `:where(${spacedRow} > :not(:last-child))`,
  utility({
    marginInlineStart: '0',
    marginInlineEnd: space(2),
  }),
);

const spaced = (gap: number, rule = {}) => {
  const root = style(utility(rule));
  globalStyle(
    `:where(${root} > :not(:last-child))`,
    utility({
      marginBlockStart: '0',
      marginBlockEnd: space(gap),
    }),
  );
  return root;
};

// Plain so the count can swap to a clear icon on hover.
const count = style([
  focusRing,
  utility({
    marginLeft: 'auto',
    display: 'flex',
    height: space(6),
    width: space(8),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: vars.radius.md,
    paddingInline: space(1),
    fontSize: vars.text.xs,
    lineHeight: vars.text.xsLineHeight,
    color: vars.color.fg.secondary,
    transitionProperty:
      'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
    transitionTimingFunction: vars.transition.timing,
    transitionDuration: vars.transition.duration,
    '@media': {
      '(hover: hover)': {
        selectors: { '&:hover': { backgroundColor: vars.color.surface.hover } },
      },
    },
  }),
]);

export const targetTracesFilterStyles = {
  search: spacedRow,
  row: style([
    focusRing,
    utility({
      display: 'flex',
      height: space(8),
      width: '100%',
      alignItems: 'center',
      gap: space(2),
      overflow: 'hidden',
      borderRadius: vars.radius.md,
      padding: space(2),
      textAlign: 'left',
      fontSize: vars.text.sm,
      lineHeight: vars.text.smLineHeight,
      transitionProperty:
        'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: vars.transition.duration,
      '@media': {
        '(hover: hover)': {
          selectors: { '&:hover': { backgroundColor: vars.color.surface.hover } },
        },
      },
    }),
  ]),
  form: spacedRow,
  empty: style([shared.textCenter, shared.text.sm, shared.fg.subtle]),
  option: style(utility({ justifyContent: 'space-between' })),
  optionLabel: style([shared.row.gap2, utility({ overflow: 'hidden' })]),
  filter: style(utility({ paddingInline: space(2) })),
  count,
  countClearIcon: style(
    utility({
      display: 'none',
      ...square(3),
      '@media': {
        '(hover: hover)': {
          selectors: { [`${count}:hover &`]: { display: 'block' } },
        },
      },
    }),
  ),
  countValue: style(
    utility({
      display: 'block',
      '@media': {
        '(hover: hover)': {
          selectors: { [`${count}:hover &`]: { display: 'none' } },
        },
      },
    }),
  ),
  filterBody: style([shared.stack.gap1, shared.fullWidth, shared.shrinkable, shared.text.sm]),
  range: spaced(6, { padding: space(2) }),
  rangeFields: spaced(2),
  rangeField: spaced(1),
  rangeLabel: style([shared.mono, shared.text.xs, shared.fg.secondary]),
};
