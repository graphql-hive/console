import { style, styleVariants } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';
import * as shared from '../../styles/shared.css';
import { palette, vars } from '../../styles/theme.css';

const tag = {
  borderRadius: vars.radius.xs,
  paddingInline: space(1),
  paddingBlock: '1px',
  fontFamily: vars.font.mono,
  fontSize: vars.text['2xs'],
  lineHeight: '1',
} as const;

const groupTitle = style(
  utility({
    fontSize: vars.text.sm,
    lineHeight: vars.text.smLineHeight,
    fontWeight: vars.weight.medium,
    color: vars.color.fg.DEFAULT,
  }),
);

const note = style(
  utility({
    maxWidth: '65ch',
    fontSize: vars.text.xs,
    lineHeight: vars.text.xsLineHeight,
    color: vars.color.fg.default,
  }),
);

const source = style(
  utility({
    display: 'flex',
    alignItems: 'center',
    gap: space(1.5),
  }),
);

export const inventorySharedStyles = {
  source,
  sourcePath: style([shared.mono, shared.text.xs, shared.fg.secondary]),
  note,
  groupTitle,
  // Where a component comes from: the design system, a base primitive or raw markup.
  origin: styleVariants({
    ui: utility({
      ...tag,
      backgroundColor: vars.color.surface.hover,
      color: vars.color.fg.default,
    }),
    base: utility({
      ...tag,
      backgroundColor: `color-mix(in srgb, hsl(${palette.success} / 0.8) 20%, transparent)`,
      color: vars.color.success.muted,
      '@supports': {
        '(color: color-mix(in lab, red, red))': {
          backgroundColor: `color-mix(in oklab, ${vars.color.success.muted} 20%, transparent)`,
        },
      },
    }),
    raw: utility({
      ...tag,
      backgroundColor: vars.color.warning.tint,
      color: vars.color.warning.text,
    }),
  }),
  list: style([shared.stack.gap4, utility({ maxWidth: vars.container['3xl'] })]),
  listHeader: style([shared.stack.base, utility({ gap: space(1.5) })]),
  listCount: style([shared.text.xs, shared.fg.default]),
  entry: style([
    shared.stack.base,
    utility({
      gap: space(0.5),
      borderBottomStyle: 'solid',
      borderBottomWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
      paddingBlock: space(2),
      selectors: {
        '&:last-child': {
          borderBottomStyle: 'solid',
          borderBottomWidth: '0px',
        },
      },
    }),
  ]),
  entryPath: style([shared.mono, shared.text.xs, shared.fg.default]),
  entryNote: style([shared.text.xs, shared.fg.secondary]),
};
