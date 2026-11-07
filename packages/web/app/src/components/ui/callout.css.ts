import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../styles/layered';
import { space, square } from '../../styles/space';
import * as shared from '../../styles/shared.css';
import { vars } from '../../styles/theme.css';

export const calloutStyles = {
  root: recipe({
    base: component({
      marginTop: space(6),
      display: 'flex',
      alignItems: 'center',
      gap: space(4),
      borderRadius: vars.radius.lg,
      borderStyle: 'solid',
      borderWidth: '1px',
      paddingInline: space(4),
      paddingBlock: space(2),
    }),
    variants: {
      type: {
        default: component({
          borderColor: vars.color.accent.line,
          backgroundColor: vars.color.accent.tint,
          color: vars.color.accent.DEFAULT,
        }),
        error: component({
          borderColor: vars.color.critical.line,
          backgroundColor: vars.color.critical.tint,
          color: vars.color.critical.text,
        }),
        info: component({
          borderColor: vars.color.info.line,
          backgroundColor: vars.color.info.tint,
          color: vars.color.info.text,
        }),
        warning: component({
          borderColor: vars.color.warning.line,
          backgroundColor: vars.color.warning.tint,
          color: vars.color.warning.text,
        }),
      },
    },
    defaultVariants: { type: 'default' },
  }),
  icon: style(component(square(6))),
  emoji: style([
    shared.text.xl,
    component({
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }),
  ]),
};
