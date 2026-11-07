import { globalStyle, style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const root = style(
  utility({
    borderLeftStyle: 'solid',
    borderLeftWidth: '1px',
    borderColor: vars.color.line.DEFAULT,
    backgroundColor: vars.color.surface.card,
    paddingInline: space(5),
    paddingBlock: space(3),
  }),
);

globalStyle(
  `:where(${root} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(6),
  }),
);

export const alertConditionsPanelStyles = {
  timestamp: style([shared.inlineRow.gap1, shared.mono, shared.text['2xs'], shared.fg.strong]),
  timestampHint: style([shared.inlineFlex, shared.fg.secondary]),
  timestampHintIcon: style(utility(square(3))),
  timestampExact: style([shared.text.xs, shared.fg.default]),
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
  title: style([
    shared.text.sm,
    shared.weight.semibold,
    shared.fg.strong,
    utility({
      marginBottom: space(2),
      display: 'block',
    }),
  ]),
  condition: style([shared.inlineRow.base, utility({ gap: space(0.5) })]),
  conditionLabel: style(utility({ textTransform: 'capitalize' })),
  status: style([
    shared.row.between,
    utility({
      borderBlockStyle: 'solid',
      borderBlockWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
      paddingBlock: space(4),
    }),
  ]),
  statusText: style([shared.stack.base, utility({ gap: space(0.5) })]),
  statusTitle: style([shared.text.sm, shared.weight.medium, shared.fg.strong]),
  statusDetail: style([shared.text.xs, shared.fg.secondary]),
};
