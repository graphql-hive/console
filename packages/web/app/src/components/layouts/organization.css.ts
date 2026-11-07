import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';
import * as shared from '../../styles/shared.css';
import * as utilities from '../../styles/utilities.css';

export const organizationLayoutStyles = {
  createIcon: style(utility({ marginRight: space(2) })),
  container: utilities.container,
  emphasis: style([shared.weight.medium, shared.fg.strong]),
};
