import { globalStyle, style } from '@vanilla-extract/css';
import { utility } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import { animate } from '../../../../styles/animations.css';
import * as shared from '../../../../styles/shared.css';

const resources = style(utility({ width: '100%' }));

globalStyle(
  `:where(${resources} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(1),
  }),
);

export const createAccessTokenSheetContentStyles = {
  reviewHint: style([shared.text.sm, shared.fg.secondary]),
  noPermissions: style(utility({ marginTop: space(3) })),
  resources,
  resourceList: style(
    utility({
      display: 'flex',
      listStyleType: 'none',
      flexWrap: 'wrap',
      gap: space(1),
    }),
  ),
  // Added to an element for one run of the animation, then removed.
  shake: style(utility({ animation: animate.shake })),
};
