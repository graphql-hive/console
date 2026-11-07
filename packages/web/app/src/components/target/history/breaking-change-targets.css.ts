import { style } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';

export const breakingChangeTargetsStyles = {
  icon: style(utility(square(3))),
  detail: style([shared.text.xs, shared.fg.secondary]),
};
