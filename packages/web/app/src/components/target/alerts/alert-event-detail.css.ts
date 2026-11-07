import { globalStyle, style, styleVariants } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const root = style(
  utility({
    paddingInline: space(4),
    paddingBottom: space(4),
  }),
);

globalStyle(
  `:where(${root} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(4),
  }),
);

const tone = (color: { DEFAULT: string; lineSubtle: string; tintSubtle: string }) =>
  utility({
    borderColor: color.lineSubtle,
    backgroundColor: color.tintSubtle,
    color: color.DEFAULT,
  });

export const alertEventDetailStyles = {
  // The state's icon colour and its summary box, by the state the rule entered.
  stateIcon: styleVariants({
    normal: utility({ color: vars.color.success.DEFAULT }),
    pending: utility({ color: vars.color.warning.DEFAULT }),
    firing: utility({ color: vars.color.critical.DEFAULT }),
    recovering: utility({ color: vars.color.info.DEFAULT }),
  }),
  stateSummary: styleVariants({
    normal: tone(vars.color.success),
    pending: tone(vars.color.warning),
    firing: tone(vars.color.critical),
    recovering: tone(vars.color.info),
  }),
  badgeIcon: style(utility(square(3))),
  flow: style([shared.inlineRow.base, utility({ gap: space(0.5) })]),
  flowState: style(
    utility({
      display: 'inline-flex',
      gap: space(1),
    }),
  ),
  flowLabel: style(utility({ textTransform: 'capitalize' })),
  flowArrow: style(utility({ ...square(3), color: vars.color.fg.subtle })),
  link: style(
    utility({
      display: 'inline-flex',
      alignItems: 'center',
      gap: space(1),
      color: vars.color.accent.DEFAULT,
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { color: vars.color.accent.muted },
          },
        },
      },
    }),
  ),
  linkIcon: style(utility(square(3))),
  root,
  summary: style(
    utility({
      borderRadius: vars.radius.md,
      borderStyle: 'solid',
      borderWidth: '1px',
      paddingInline: space(3),
      paddingBlock: space(2),
      fontSize: vars.text.control,
      lineHeight: vars.text.controlLineHeight,
    }),
  ),
  footer: style(
    utility({
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: space(4),
    }),
  ),
  ruleLinkLabel: style([
    shared.text.control,
    utility({
      paddingInline: space(2.5),
      paddingBlock: space(1.5),
    }),
  ]),
  ruleLinkArrow: style(
    utility({
      borderLeftStyle: 'solid',
      borderLeftWidth: '1px',
      borderLeftColor: 'currentcolor',
      paddingInline: space(2),
      paddingBlock: space(1.5),
      '@supports': {
        '(color: color-mix(in lab, red, red))': {
          borderLeftColor: 'color-mix(in oklab, currentcolor 20%, transparent)',
        },
      },
    }),
  ),
  ruleLinkArrowIcon: style(utility(square(3.5))),
};
