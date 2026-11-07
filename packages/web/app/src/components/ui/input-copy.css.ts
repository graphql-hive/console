import { globalStyle, style } from '@vanilla-extract/css';
import { component } from '../../styles/layered';
import { space } from '../../styles/space';
import { vars } from '../../styles/theme.css';

const root = style(
  component({
    display: 'flex',
    width: '100%',
    maxWidth: vars.container['2xl'],
    alignItems: 'center',
  }),
);

globalStyle(
  `:where(${root} > :not(:last-child))`,
  component({
    marginInlineStart: '0',
    marginInlineEnd: space(2),
  }),
);

export const inputCopyStyles = {
  root,
  action: style(
    component({
      flexShrink: '0',
      alignSelf: 'baseline',
    }),
  ),
};
