import { globalStyle, style, styleVariants } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import * as shared from '../styles/shared.css';
import { vars } from '../styles/theme.css';

const conditions = style(
  utility({
    fontSize: vars.text.xs,
    lineHeight: vars.text.xsLineHeight,
  }),
);

globalStyle(
  `:where(${conditions} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(1),
  }),
);

export const targetAlertsRulesStyles = {
  conditionsHint: style([
    shared.inlineFlex,
    shared.fg.muted,
    utility({
      '@media': {
        '(hover: hover)': {
          selectors: { '&:hover': { color: vars.color.fg.default } },
        },
      },
    }),
  ]),
  conditionsHintIcon: style(utility(square(3.5))),
  conditions,
  conditionValue: style([shared.mono, shared.fg.strong]),
  usageChip: style(
    utility({
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: vars.radius.sm,
      borderStyle: 'solid',
      borderWidth: '1px',
      paddingInline: space(1.5),
      paddingBlock: space(0.5),
      fontSize: '11px',
      fontWeight: vars.weight.medium,
      fontVariantNumeric: 'tabular-nums',
    }),
  ),
  // How close the rule count is to the limit.
  usageTone: styleVariants({
    critical: utility({
      borderColor: vars.color.critical.line,
      backgroundColor: vars.color.critical.tintSubtle,
      color: vars.color.critical.DEFAULT,
    }),
    warning: utility({
      borderColor: vars.color.warning.line,
      backgroundColor: vars.color.warning.tint,
      color: vars.color.warning.text,
    }),
    neutral: utility({
      borderColor: vars.color.line.DEFAULT,
      backgroundColor: vars.color.surface.card,
      color: vars.color.fg.default,
    }),
  }),
  error: style([
    shared.flex,
    shared.text.sm,
    shared.fg.critical,
    utility({ justifyContent: 'center', paddingBlock: space(12) }),
  ]),
};
