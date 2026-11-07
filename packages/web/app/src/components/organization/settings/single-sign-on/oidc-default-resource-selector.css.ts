import { style } from '@vanilla-extract/css';
import { utility } from '../../../../styles/layered';
import { vars } from '../../../../styles/theme.css';

const corner = {
  position: 'absolute',
  top: '0px',
  right: '0px',
} as const;

// The save state sits in the field's top-right corner.
export const oidcDefaultResourceSelectorStyles = {
  pending: style(utility(corner)),
  failed: style(utility({ ...corner, color: vars.color.critical.DEFAULT })),
  saved: style(utility({ ...corner, color: vars.color.success.DEFAULT })),
};
