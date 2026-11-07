import { style } from '@vanilla-extract/css';
import { component } from '../../styles/layered';
import * as shared from '../../styles/shared.css';
import { vars } from '../../styles/theme.css';

export const pageStyles = {
  title: style([
    shared.text.lg,
    shared.weight.semibold,
    component({
      cursor: 'default',
      letterSpacing: vars.tracking.tight,
    }),
  ]),
  subtitle: style([shared.text.sm, shared.fg.secondary, component({ cursor: 'default' })]),
};
