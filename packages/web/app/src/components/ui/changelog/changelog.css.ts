import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { component } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import { animate } from '../../../styles/animations.css';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const header = style(component({ padding: space(4) }));

globalStyle(
  `:where(${header} > :not(:last-child))`,
  component({
    marginBlockStart: '0',
    marginBlockEnd: space(2),
  }),
);

export const changelogStyles = {
  root: style([shared.relative, shared.inlineFlex]),
  content: style(component({ display: 'grid' })),
  header,
  title: style([
    shared.weight.medium,
    shared.fg.strong,
    component({
      fontSize: vars.text.sm,
      lineHeight: '1',
    }),
  ]),
  subtitle: style([shared.text.control, shared.fg.default]),
  list: style(
    component({
      position: 'relative',
      margin: '0px',
    }),
  ),
  // An accent rule marks the changes not read yet.
  item: recipe({
    base: component({
      borderLeftStyle: 'solid',
      borderLeftWidth: '2px',
      paddingInline: space(4),
    }),
    variants: {
      read: {
        true: component({ borderColor: 'transparent' }),
        false: component({ borderColor: vars.color.accent.muted }),
      },
    },
  }),
  date: style([
    shared.text.xs,
    shared.weight.normal,
    shared.fg.secondary,
    component({ marginBottom: space(1) }),
  ]),
  changeTitle: style([
    shared.text.sm,
    shared.weight.medium,
    shared.fg.strong,
    component({
      marginBottom: space(0.5),
      ...({ textWrap: 'pretty' } as object),
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { textDecorationLine: 'underline' },
          },
        },
      },
    }),
  ]),
  changeDescription: style([
    shared.text.control,
    shared.weight.normal,
    shared.fg.default,
    component({
      marginBottom: space(5),
      ...({ textWrap: 'pretty' } as object),
    }),
  ]),
  footer: style(
    component({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: space(2),
      paddingBottom: space(5),
    }),
  ),
  dot: style(
    component({
      position: 'absolute',
      top: '0px',
      right: '0px',
      marginTop: space(-1),
      marginRight: space(-1),
      display: 'flex',
      ...square(2),
    }),
  ),
  dotPulse: style([
    shared.inlineFlex,
    shared.fullWidth,
    component({
      position: 'absolute',
      height: '100%',
      animation: animate.pulse,
      borderRadius: vars.radius.full,
      backgroundColor: vars.color.accent.DEFAULT,
    }),
  ]),
};
