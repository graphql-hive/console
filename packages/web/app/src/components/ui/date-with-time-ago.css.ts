import { style } from '@vanilla-extract/css';
import * as shared from '../../styles/shared.css';

export const dateWithTimeAgoStyles = {
  timeAgo: style([shared.weight.normal, shared.fg.secondary]),
};
