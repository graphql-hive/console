import { globalStyle, style } from '@vanilla-extract/css';
import { utility } from '../styles/layered';
import { space, square } from '../styles/space';
import * as shared from '../styles/shared.css';
import { vars } from '../styles/theme.css';

const sections = style({});

globalStyle(
  `:where(${sections} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(12),
  }),
);

export const projectSettingsStyles = {
  root: style(
    utility({
      display: 'flex',
      flexDirection: 'column',
      rowGap: space(10),
    }),
  ),
  sections,
  // The GitHub integration explainer: two steps joined by an arrow.
  github: style([shared.text.sm, shared.fg.secondary]),
  githubSteps: style([
    shared.stack.base,
    utility({ marginBlock: space(8), width: 'fit-content', rowGap: space(1) }),
  ]),
  githubStep: style([shared.row.base, utility({ columnGap: space(2), paddingLeft: space(1) })]),
  githubStepCheck: style(utility({ ...square(4), color: vars.color.success.DEFAULT })),
  githubStepLogo: style([
    shared.row.base,
    shared.icon.xl,
    utility({
      justifyContent: 'center',
      borderRadius: vars.radius.sm,
      backgroundColor: vars.color.surface.inverse,
    }),
  ]),
  githubStepLogoIcon: style(utility({ width: '80%', height: '80%' })),
  githubStepText: style([shared.weight.semibold, shared.fg.default]),
  githubStepArrow: style(utility({ ...square(6), alignSelf: 'center' })),
  policyOverride: style([
    shared.text.sm,
    shared.weight.bold,
    shared.fg.secondary,
    utility({ paddingLeft: space(1) }),
  ]),
  policyOverrideMark: style(
    utility({
      marginRight: space(4),
      display: 'inline-block',
      color: vars.color.fg.inverse,
    }),
  ),
};
