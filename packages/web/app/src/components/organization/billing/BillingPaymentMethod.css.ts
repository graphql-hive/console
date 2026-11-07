import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';

export const billingPaymentMethodStyles = {
  // The current method and where to manage it.
  manage: style(utility({ marginTop: space(4) })),
  manageText: style(utility({ paddingBottom: space(4) })),
  manageLinkIcon: style(utility({ marginRight: space(1), ...square(4) })),
  // The card entry form.
  form: style(utility({ width: '50%' })),
  cardElement: style(utility({ flexGrow: '1' })),
  formNote: style([shared.text.sm, shared.fg.secondary]),
};
