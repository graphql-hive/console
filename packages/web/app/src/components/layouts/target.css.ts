import { globalStyle, style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';
import * as shared from '../../styles/shared.css';
import { vars } from '../../styles/theme.css';

// A block whose children are spaced apart; the tab bodies of the federation modal and the
// endpoint section of the CDN modal.
const section = style({});

globalStyle(
  `:where(${section} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(2),
  }),
);

export const targetLayoutStyles = {
  cdnAction: style([
    shared.hidden,
    utility({
      '@media': {
        '(width >= 48rem)': { display: 'block' },
      },
    }),
  ]),
  cdnActionLabel: style([shared.row.base, shared.nowrap]),
  cdnActionIcon: style(utility({ marginRight: space(2) })),
  connectModal: style(utility({ maxWidth: '600px' })),
  connectModalControls: style(
    utility({
      marginTop: space(1),
      marginBottom: space(5),
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      gap: space(3),
    }),
  ),
  connectModalEndpoint: style([
    section,
    utility({
      fontSize: vars.text.sm,
      lineHeight: vars.text.smLineHeight,
    }),
  ]),
  federationModal: style([
    shared.stack.base,
    shared.grow,
    shared.text.sm,
    utility({
      marginTop: space(2),
      minHeight: '300px',
    }),
  ]),
  federationModalTab: section,
  federationModalCommand: style(utility({ marginTop: space(2) })),
};
