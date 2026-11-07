import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../styles/layered';
import { space } from '../../styles/space';
import * as shared from '../../styles/shared.css';

const row = style(
  utility({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBlock: space(2),
  }),
);

globalStyle(
  `:where(${row} > :not(:last-child))`,
  utility({
    marginInlineStart: '0',
    marginInlineEnd: space(4),
  }),
);

export const permissionsStyles = {
  scope: recipe({
    base: [row],
    variants: {
      locked: {
        true: utility({
          cursor: 'not-allowed',
          opacity: '50%',
        }),
      },
    },
  }),
  scopeName: style([shared.weight.semibold, shared.fg.strong]),
  scopeDescription: style([shared.text.xs, shared.fg.secondary]),
};
