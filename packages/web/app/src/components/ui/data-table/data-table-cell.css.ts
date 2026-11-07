import { style, styleVariants } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const tone = styleVariants({
  default: component({ color: vars.color.fg.DEFAULT }),
  muted: component({ color: vars.color.fg.secondary }),
});

const mono = style(
  component({
    fontFamily: vars.font.mono,
    fontSize: vars.text.xs,
    lineHeight: vars.text.xsLineHeight,
  }),
);

const inlineGroup = style(
  component({
    display: 'inline-flex',
    alignItems: 'center',
    gap: space(1),
  }),
);

const icon = style(component(square(3.5)));

const hover = (rule: { color: string; textDecorationLine?: string }) => ({
  '@media': {
    '(hover: hover)': {
      selectors: { '&:hover': rule },
    },
  },
});

export const dataTableCellStyles = {
  text: recipe({
    variants: {
      tone: {
        default: [tone.default],
        muted: [tone.muted],
      },
      weight: {
        regular: {},
        medium: component({ fontWeight: vars.weight.medium }),
      },
      mono: { true: [mono] },
      truncate: {
        true: component({
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }),
      },
    },
    defaultVariants: { tone: 'default' },
  }),
  secondary: tone.muted,
  number: style([
    shared.fg.strong,
    shared.tabularNums,
    component({
      display: 'block',
      textAlign: 'right',
    }),
  ]),
  time: recipe({
    base: [inlineGroup],
    variants: {
      tone: {
        default: [tone.default],
        muted: [tone.muted],
      },
      mono: { true: [mono] },
    },
    defaultVariants: { tone: 'default' },
  }),
  timePrefix: tone.muted,
  hint: style([shared.inlineFlex, shared.fg.muted]),
  icon,
  link: recipe({
    variants: {
      tone: {
        default: component({
          color: vars.color.fg.default,
          textUnderlineOffset: '2px',
          ...hover({ color: vars.color.fg.DEFAULT, textDecorationLine: 'underline' }),
        }),
        accent: component({
          color: vars.color.accent.muted,
          textUnderlineOffset: '2px',
          ...hover({ color: vars.color.accent.DEFAULT, textDecorationLine: 'underline' }),
        }),
      },
      mono: { true: [mono] },
      truncate: {
        true: component({
          display: 'block',
          minWidth: '0px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }),
      },
    },
    defaultVariants: { tone: 'default' },
  }),
  linkOutLabel: recipe({
    base: [tone.default],
    variants: {
      mono: { true: [mono] },
    },
  }),
  linkOut: style(
    component({
      display: 'inline-flex',
      color: vars.color.fg.muted,
      ...hover({ color: vars.color.fg.DEFAULT }),
    }),
  ),
  linkOutMenu: style([
    shared.inlineRow.base,
    shared.fg.muted,
    component(hover({ color: vars.color.fg.DEFAULT })),
  ]),
  linkOutMenuChevron: style(component(square(3))),
  badges: inlineGroup,
  check: style(
    component({
      display: 'inline',
      ...square(4),
      color: vars.color.success.DEFAULT,
    }),
  ),
  cross: style(
    component({
      display: 'inline',
      ...square(4),
      color: vars.color.fg.muted,
    }),
  ),
  status: style([shared.inlineRow.gap1_5, shared.fg.strong]),
  statusIconTone: {
    ...styleVariants({
      success: component({ color: vars.color.success.DEFAULT }),
      warning: component({ color: vars.color.warning.DEFAULT }),
      critical: component({ color: vars.color.critical.DEFAULT }),
      info: component({ color: vars.color.info.DEFAULT }),
    }),
    neutral: tone.muted,
  },
  statusChange: style([shared.inlineRow.gap2, shared.fg.default]),
  statusChangeArrow: style(component({ ...square(3.5), color: vars.color.fg.subtle })),
  avatar: style([shared.inlineRow.gap2, shared.fg.strong]),
  actions: style(
    component({
      display: 'flex',
      justifyContent: 'flex-end',
    }),
  ),
  bar: style(
    component({
      display: 'flex',
      justifyContent: 'flex-end',
      gap: space(1),
    }),
  ),
  barSegment: recipe({
    base: component({
      height: space(4),
      width: space(1),
    }),
    variants: {
      filled: {
        true: component({ backgroundColor: vars.color.success.DEFAULT }),
        false: component({ backgroundColor: vars.color.neutral[6] }),
      },
    },
  }),
  placeholder: tone.muted,
};
