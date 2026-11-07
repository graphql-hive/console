import { globalStyle, style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space } from '../styles/space';
import * as shared from '../styles/shared.css';

const slider = style({});

globalStyle(
  `:where(${slider} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(2),
  }),
);

export const organizationSubscriptionManageStyles = {
  root: style(
    utility({
      display: 'flex',
      flexDirection: 'column',
      rowGap: space(10),
    }),
  ),
  header: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBlock: space(6),
    }),
  ),
  actions: style(utility({ marginTop: space(2) })),
  actionsRow: style(
    utility({
      marginBlock: space(8),
      display: 'flex',
      flexDirection: 'row',
      gap: space(6),
    }),
  ),
  actionsColumn: style(utility({ width: '50%' })),
  actionsHeading: style(utility({ marginBottom: space(3) })),
  actionsFooter: style(utility({ marginTop: space(4) })),
  body: style([shared.stack.base, shared.fullWidth, utility({ gap: space(5) })]),
  summary: style(utility({ width: '100%', alignSelf: 'flex-start' })),
  plan: style(utility({ marginBlock: space(8), width: '50%' })),
  planNote: style([shared.text.sm, shared.fg.secondary]),
  planSlider: style(utility({ marginTop: space(5), paddingLeft: space(2.5) })),
  slider,
  sliderHeader: style(
    utility({
      display: 'flex',
      justifyContent: 'space-between',
    }),
  ),
  sliderInput: style(utility({ marginLeft: 'auto', width: space(48) })),
  sliderError: style([
    shared.text.sm,
    shared.fg.critical,
    utility({ marginTop: space(1), textAlign: 'end' }),
  ]),
};
