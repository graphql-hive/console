import { style } from '@vanilla-extract/css';
import { utility } from '../../styles/layered';
import { square } from '../../styles/space';
import { vars } from '../../styles/theme.css';

export const targetEnvPluginStyles = {
  icon: style(utility({ ...square(4), color: vars.color.warning.DEFAULT })),
};
