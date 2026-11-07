import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const fields = style({});

globalStyle(
  `:where(${fields} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(4),
  }),
);

const conditions = style(utility({ marginLeft: space(4) }));

globalStyle(
  `:where(${conditions} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(3),
  }),
);

const errors = style(utility({ color: vars.color.critical.DEFAULT }));

globalStyle(
  `:where(${errors} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(1),
  }),
);

export const appDeploymentProtectionFormStyles = {
  // Faded and inert until protection is switched on.
  root: recipe({
    base: [shared.fg.secondary],
    variants: {
      disabled: {
        true: utility({
          pointerEvents: 'none',
          opacity: '25%',
        }),
      },
    },
  }),
  fields,
  lead: style(utility({ marginBottom: space(2) })),
  conditions,
  note: style([shared.text.sm, shared.fg.default]),
  errors,
};
