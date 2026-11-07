import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

export const reviewStyles = {
  comments: style(
    utility({
      marginBottom: space(2),
      borderRadius: vars.radius.sm,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.line.strong,
      backgroundColor: vars.color.surface.inset,
      paddingInline: space(6),
      paddingBlock: space(4),
      fontFamily: vars.font.sans,
    }),
  ),
  actions: style(
    utility({
      marginTop: space(3),
      marginBottom: space(6),
      marginLeft: space(6),
      display: 'flex',
      gap: space(4),
      fontFamily: vars.font.sans,
    }),
  ),
  actionIcon: style(utility({ marginRight: space(1) })),
  // A reply is indented under the first comment.
  commentHeader: recipe({
    base: [
      shared.flex,
      shared.grow,
      utility({
        flexDirection: 'row',
        verticalAlign: 'middle',
      }),
    ],
    variants: {
      reply: {
        true: utility({ paddingLeft: space(4) }),
      },
    },
  }),
  commentAuthor: style([shared.flex, shared.grow, shared.weight.bold, shared.fg.secondary]),
  commentMeta: style([shared.flex, shared.text.xs]),
  commentTime: style(utility({ color: vars.color.fg.secondary })),
  commentBody: style(
    utility({
      marginTop: space(2),
      flexDirection: 'row',
    }),
  ),
};
