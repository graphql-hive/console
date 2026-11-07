import { globalStyle, style, styleVariants } from '@vanilla-extract/css';
import { component } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { palette, vars } from '../../../styles/theme.css';

const header = style({});

globalStyle(`${header} tr:hover`, component({ backgroundColor: 'transparent' }));

const body = style(
  component({
    transitionProperty: 'opacity',
    transitionTimingFunction: vars.transition.timing,
    transitionDuration: vars.transition.duration,
  }),
);

globalStyle(
  `${body} > tr:last-child`,
  component({
    borderStyle: 'solid',
    borderWidth: '0px',
  }),
);

const hover = (color: string, dark?: string) => ({
  '@media': {
    '(hover: hover)': {
      selectors: {
        '&:hover': { backgroundColor: color },
        ...(dark ? { '&:where(.dark, .dark *):hover': { backgroundColor: dark } } : {}),
      },
    },
  },
});

const mixed = (light: string, dark: string, lightOklab: string, darkOklab: string) =>
  component({
    backgroundColor: light,
    selectors: {
      '&:where(.dark, .dark *)': { backgroundColor: dark },
    },
    '@supports': {
      '(color: color-mix(in lab, red, red))': {
        backgroundColor: lightOklab,
        selectors: {
          '&:where(.dark, .dark *)': { backgroundColor: darkOklab },
        },
      },
    },
  });

// The table's chrome, applied part by part from `data-table-components.tsx`, which decides per
// prop which of these a part gets.
export const dataTableComponentsStyles = {
  align: styleVariants({
    left: component({ textAlign: 'left' }),
    center: component({ textAlign: 'center' }),
    right: component({ textAlign: 'right' }),
  }),
  width: styleVariants({
    xs: component({ width: space(16) }),
    sm: component({ width: space(32) }),
    md: component({ width: space(48) }),
    lg: component({ width: space(64) }),
    // `maxWidth: 0` lets the fill column absorb the leftover width instead of widening the table
    // to fit its content, which is what allows a truncated cell to truncate at all.
    fill: component({
      width: '100%',
      maxWidth: '0px',
      overflow: 'hidden',
    }),
  }),
  hideBelow: styleVariants({
    sm: component({
      display: 'none',
      '@media': { '(width >= 40rem)': { display: 'table-cell' } },
    }),
    md: component({
      display: 'none',
      '@media': { '(width >= 48rem)': { display: 'table-cell' } },
    }),
  }),
  wrapper: style(
    component({
      overflow: 'hidden',
      borderRadius: vars.radius.md,
    }),
  ),
  wrapperBorder: style(
    component({
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
    }),
  ),
  // The toned ladder brings the border colour itself.
  wrapperTonedBorder: style(
    component({
      borderStyle: 'solid',
      borderWidth: '1px',
    }),
  ),
  // The surface ladder for the table's own chrome. The wrapper sits one step off the page and the
  // header one more; a raised table (in a sheet, dialog or raised card) starts one step higher.
  surface: {
    base: {
      wrapper: style(
        component({
          backgroundColor: vars.color.neutral[1],
          selectors: {
            '&:where(.dark, .dark *)': { backgroundColor: vars.color.neutral[2] },
          },
        }),
      ),
      head: style(component({ backgroundColor: vars.color.surface.card })),
      stripe: style(
        mixed(
          `color-mix(in srgb, hsl(${palette.neutral[2]}) 60%, transparent)`,
          `color-mix(in srgb, hsl(${palette.neutral[3]}) 60%, transparent)`,
          `color-mix(in oklab, ${vars.color.neutral[2]} 60%, transparent)`,
          `color-mix(in oklab, ${vars.color.neutral[3]} 60%, transparent)`,
        ),
      ),
      hover: style(component(hover(vars.color.neutral[3], vars.color.neutral[4]))),
    },
    raised: {
      wrapper: style(component({ backgroundColor: vars.color.surface.card })),
      head: style(
        component({
          backgroundColor: vars.color.neutral[3],
          selectors: {
            '&:where(.dark, .dark *)': { backgroundColor: vars.color.neutral[4] },
          },
        }),
      ),
      stripe: style(
        mixed(
          `color-mix(in srgb, hsl(${palette.neutral[3]}) 60%, transparent)`,
          `color-mix(in srgb, hsl(${palette.neutral[4]}) 60%, transparent)`,
          `color-mix(in oklab, ${vars.color.neutral[3]} 60%, transparent)`,
          `color-mix(in oklab, ${vars.color.neutral[4]} 60%, transparent)`,
        ),
      ),
      hover: style(component(hover(vars.color.neutral[4], vars.color.neutral[5]))),
    },
  },
  // A toned table tints every part in its colour instead of climbing the neutral ladder.
  toned: {
    critical: {
      wrapper: style(
        component({
          borderColor: vars.color.critical.line,
          backgroundColor: vars.color.critical.tintSubtle,
        }),
      ),
      head: style(component({ backgroundColor: vars.color.critical.tint })),
      stripe: style(
        component({
          backgroundColor: `color-mix(in srgb, hsl(${palette.critical} / 0.1) 40%, transparent)`,
          '@supports': {
            '(color: color-mix(in lab, red, red))': {
              backgroundColor: `color-mix(in oklab, ${vars.color.critical.tint} 40%, transparent)`,
            },
          },
        }),
      ),
      hover: style(component(hover(vars.color.critical.tint))),
      line: style(component({ borderColor: vars.color.critical.lineSubtle })),
      titleLine: style(component({ borderColor: vars.color.critical.line })),
      icon: style(component({ color: vars.color.critical.DEFAULT })),
    },
    warning: {
      wrapper: style(
        component({
          borderColor: vars.color.warning.line,
          backgroundColor: vars.color.warning.tintSubtle,
        }),
      ),
      head: style(component({ backgroundColor: vars.color.warning.tint })),
      stripe: style(
        component({
          backgroundColor: `color-mix(in srgb, hsl(${palette.warning} / 0.1) 40%, transparent)`,
          '@supports': {
            '(color: color-mix(in lab, red, red))': {
              backgroundColor: `color-mix(in oklab, ${vars.color.warning.tint} 40%, transparent)`,
            },
          },
        }),
      ),
      hover: style(component(hover(vars.color.warning.tint))),
      line: style(component({ borderColor: vars.color.warning.lineSubtle })),
      titleLine: style(component({ borderColor: vars.color.warning.line })),
      icon: style(component({ color: vars.color.warning.DEFAULT })),
    },
  },
  titleBar: style(
    component({
      display: 'flex',
      alignItems: 'center',
      gap: space(2),
      borderBottomStyle: 'solid',
      borderBottomWidth: '1px',
      paddingInline: space(4),
      paddingBlock: space(2.5),
    }),
  ),
  titleBarLine: style(component({ borderColor: vars.color.line.DEFAULT })),
  titleBarIcon: style(component({ ...square(4), flexShrink: '0' })),
  titleBarIconMuted: style(component({ color: vars.color.fg.secondary })),
  title: style([shared.text.sm, shared.weight.medium, shared.fg.strong]),
  // Held to the title's line height so a compact button does not make the bar taller.
  titleAside: style([
    shared.row.base,
    shared.text.xs,
    shared.fg.secondary,
    component({
      marginLeft: 'auto',
      height: space(5),
    }),
  ]),
  header,
  body,
  bodyRefreshing: style(
    component({
      pointerEvents: 'none',
      opacity: '50%',
    }),
  ),
  // The row's `data-state` carries expanded or selected.
  row: style(
    component({
      borderBottomStyle: 'solid',
      borderBottomWidth: '1px',
      transitionProperty:
        'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: vars.transition.duration,
      selectors: {
        '&[data-state="expanded"]': {
          borderBottomStyle: 'solid',
          borderBottomWidth: '0px',
          backgroundColor: vars.color.neutral[3],
        },
        '&[data-state="selected"]': {
          backgroundColor: `color-mix(in srgb, hsl(${palette.neutral[12]}) 10%, transparent)`,
        },
      },
      '@supports': {
        '(color: color-mix(in lab, red, red))': {
          selectors: {
            '&[data-state="selected"]': {
              backgroundColor: `color-mix(in oklab, ${vars.color.neutral[12]} 10%, transparent)`,
            },
          },
        },
      },
    }),
  ),
  rowLine: style(component({ borderColor: vars.color.line.DEFAULT })),
  rowCritical: style(component({ backgroundColor: vars.color.critical.tintSubtle })),
  rowClickable: style(component({ cursor: 'pointer' })),
  rowMuted: style(component({ color: vars.color.fg.secondary })),
  rowDisabled: style(component({ opacity: '40%' })),
  headCompact: style(component({ height: space(10), width: space(10) })),
  head: style(
    component({
      height: space(10),
      paddingInline: space(4),
      textAlign: 'left',
      verticalAlign: 'middle',
      fontSize: vars.text.xs,
      lineHeight: vars.text.xsLineHeight,
      fontWeight: vars.weight.normal,
      whiteSpace: 'nowrap',
      color: vars.color.fg.secondary,
    }),
  ),
  // Cells keep their content on one line; a `fill` column absorbs the width and a cell that opts
  // into `truncate` gives way, so a short value never breaks mid-phrase.
  cell: style(
    component({
      height: space(12),
      paddingInline: space(4),
      verticalAlign: 'middle',
      whiteSpace: 'nowrap',
    }),
  ),
  cellCompact: style(
    component({
      height: space(12),
      width: space(10),
      paddingInline: space(2),
      verticalAlign: 'middle',
      color: vars.color.fg.secondary,
    }),
  ),
  cellEmpty: style(
    component({
      height: space(24),
      textAlign: 'center',
      verticalAlign: 'middle',
      color: vars.color.fg.secondary,
    }),
  ),
  cellPanel: style(
    component({
      padding: '0px',
      verticalAlign: 'middle',
    }),
  ),
  expandedRow: style(
    component({
      borderBottomStyle: 'solid',
      borderBottomWidth: '1px',
    }),
  ),
  expandedRowDefault: style(
    component({
      borderColor: vars.color.line.DEFAULT,
      backgroundColor: vars.color.neutral[3],
    }),
  ),
  footerRow: style(
    component({
      borderTopStyle: 'solid',
      borderTopWidth: '1px',
    }),
  ),
  footerRowLine: style(component({ borderColor: vars.color.line.DEFAULT })),
  footerLabel: style([
    shared.weight.medium,
    shared.fg.strong,
    component({
      height: space(12),
      paddingInline: space(4),
      verticalAlign: 'middle',
    }),
  ]),
  footerValue: style([
    shared.weight.medium,
    shared.fg.strong,
    component({
      height: space(12),
      paddingInline: space(4),
      textAlign: 'right',
      verticalAlign: 'middle',
    }),
  ]),
};
