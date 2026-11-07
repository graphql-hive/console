import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

export const billingPlanPickerStyles = {
  trialNote: style([shared.text.sm, shared.weight.bold, utility({ marginBottom: space(2) })]),
  supportFeature: style(utility({ gap: space(1) })),
  supportLink: style([
    shared.weight.medium,
    shared.fg.accent,
    utility({
      transitionProperty:
        'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke',
      transitionTimingFunction: vars.transition.timing,
      transitionDuration: vars.transition.duration,
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { textDecorationLine: 'underline' },
          },
        },
      },
    }),
  ]),
  // `alignSelf: stretch` because the radio item centers its content, and a plan body must fill
  // the card so the footers line up across plans with different feature counts.
  plan: style([
    shared.stack.base,
    shared.fullWidth,
    utility({
      height: '100%',
      justifyContent: 'space-between',
      alignSelf: 'stretch',
    }),
  ]),
  planName: style([shared.row.between, shared.text.base, shared.weight.bold, shared.fg.default]),
  planPrice: style([shared.text['3xl'], shared.weight.bold]),
  planPeriod: style([shared.text.sm, shared.fg.secondary]),
  planDescription: style([shared.text.sm, shared.fg.secondary]),
  planFeatures: style([shared.stack.gap2, utility({ marginTop: space(6) })]),
  planFeature: style([shared.row.gap1, shared.text.sm, shared.fg.secondary]),
  planFeatureIcon: style(utility({ ...square(5), color: vars.color.fg.secondary })),
  planRule: style(
    utility({
      marginInline: 'auto',
      marginBlock: space(4),
      width: '75%',
      borderBottomStyle: 'solid',
      borderBottomWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
    }),
  ),
  planFooter: style([shared.text.xs, shared.fg.default]),
};
