import { style, styleVariants, type StyleRule } from '@vanilla-extract/css';
import { component } from './layered';
import { space, square } from './space';
import { vars } from './theme.css';

/*
 * The shared vocabulary: the handful of styles the app says over and over. A component composes
 * these (`clsx(shared.row.gap2, shared.text.sm)`) and keeps its own stylesheet for what is its own.
 *
 * Everything here is in the `components` layer, below call-site styles in `utilities`, so a page
 * can still override a primitive on an element that carries one.
 */
/** A map of named rules, each in the components layer. Typed so literals stay literals. */
const variants = <K extends string>(rules: Record<K, StyleRule>) => styleVariants(rules, component);

// Text -----------------------------------------------------------------------------------------

/** Size and line height together, as the type scale defines them. */
export const text = variants({
  '2xs': { fontSize: vars.text['2xs'], lineHeight: vars.text['2xsLineHeight'] },
  xs: { fontSize: vars.text.xs, lineHeight: vars.text.xsLineHeight },
  control: { fontSize: vars.text.control, lineHeight: vars.text.controlLineHeight },
  sm: { fontSize: vars.text.sm, lineHeight: vars.text.smLineHeight },
  base: { fontSize: vars.text.base, lineHeight: vars.text.baseLineHeight },
  lg: { fontSize: vars.text.lg, lineHeight: vars.text.lgLineHeight },
  xl: { fontSize: vars.text.xl, lineHeight: vars.text.xlLineHeight },
  '2xl': { fontSize: vars.text['2xl'], lineHeight: vars.text['2xlLineHeight'] },
  '3xl': { fontSize: vars.text['3xl'], lineHeight: vars.text['3xlLineHeight'] },
  '4xl': { fontSize: vars.text['4xl'], lineHeight: vars.text['4xlLineHeight'] },
});

export const weight = variants({
  normal: { fontWeight: vars.weight.normal },
  medium: { fontWeight: vars.weight.medium },
  semibold: { fontWeight: vars.weight.semibold },
  bold: { fontWeight: vars.weight.bold },
});

/** Foreground colour by role. */
export const fg = variants({
  strong: { color: vars.color.fg.DEFAULT },
  default: { color: vars.color.fg.default },
  secondary: { color: vars.color.fg.secondary },
  muted: { color: vars.color.fg.muted },
  subtle: { color: vars.color.fg.subtle },
  inverse: { color: vars.color.fg.inverse },
  accent: { color: vars.color.accent.DEFAULT },
  success: { color: vars.color.success.DEFAULT },
  successText: { color: vars.color.success.text },
  info: { color: vars.color.info.DEFAULT },
  warning: { color: vars.color.warning.DEFAULT },
  critical: { color: vars.color.critical.DEFAULT },
  criticalText: { color: vars.color.critical.text },
});

export const mono = style(component({ fontFamily: vars.font.mono }));
export const tabularNums = style(component({ fontVariantNumeric: 'tabular-nums' }));
export const textCenter = style(component({ textAlign: 'center' }));
export const truncate = style(
  component({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
);
export const nowrap = style(component({ whiteSpace: 'nowrap' }));
export const breakAll = style(component({ wordBreak: 'break-all' }));
export const lineThrough = style(component({ textDecorationLine: 'line-through' }));

/** Visually hidden, still read by assistive technology. */
export const srOnly = style(
  component({
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    borderWidth: 0,
  }),
);

// Icons ----------------------------------------------------------------------------------------

/** Icon sizes, by the spacing step they are square in: 3 is 12px, 3.5 is 14px, 4 is 16px. */
export const icon = variants({
  xs: square(3),
  sm: square(3.5),
  md: square(4),
  lg: square(5),
  xl: square(6),
});

// Layout ---------------------------------------------------------------------------------------

/** A horizontal flex row with items centred, with or without a gap. */
export const row = variants({
  base: { display: 'flex', alignItems: 'center' },
  gap1: { display: 'flex', alignItems: 'center', gap: space(1) },
  gap1_5: { display: 'flex', alignItems: 'center', gap: space(1.5) },
  gap2: { display: 'flex', alignItems: 'center', gap: space(2) },
  gap3: { display: 'flex', alignItems: 'center', gap: space(3) },
  gap4: { display: 'flex', alignItems: 'center', gap: space(4) },
  between: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  wrap2: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: space(2) },
});

/** The inline-flex forms of `row`, for text-level containers. */
export const inlineRow = variants({
  base: { display: 'inline-flex', alignItems: 'center' },
  gap1: { display: 'inline-flex', alignItems: 'center', gap: space(1) },
  gap1_5: { display: 'inline-flex', alignItems: 'center', gap: space(1.5) },
  gap2: { display: 'inline-flex', alignItems: 'center', gap: space(2) },
});

/** A vertical flex column, with or without a gap. */
export const stack = variants({
  base: { display: 'flex', flexDirection: 'column' },
  gap1: { display: 'flex', flexDirection: 'column', gap: space(1) },
  gap2: { display: 'flex', flexDirection: 'column', gap: space(2) },
  gap3: { display: 'flex', flexDirection: 'column', gap: space(3) },
  gap4: { display: 'flex', flexDirection: 'column', gap: space(4) },
  gap6: { display: 'flex', flexDirection: 'column', gap: space(6) },
  gap8: { display: 'flex', flexDirection: 'column', gap: space(8) },
});

export const flex = style(component({ display: 'flex' }));
export const inlineFlex = style(component({ display: 'inline-flex' }));
export const grow = style(component({ flexGrow: 1 }));
export const fill = style(component({ flex: 1 }));
/** `min-width: 0` on a flex child, so it can shrink and truncate. */
export const shrinkable = style(component({ minWidth: 0 }));
export const fillShrinkable = style(component({ minWidth: 0, flex: 1 }));
export const noShrink = style(component({ flexShrink: 0 }));
export const fullWidth = style(component({ width: '100%' }));
export const relative = style(component({ position: 'relative' }));
export const hidden = style(component({ display: 'none' }));
export const contents = style(component({ display: 'contents' }));
