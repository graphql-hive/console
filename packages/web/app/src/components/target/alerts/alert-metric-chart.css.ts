import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const legend = style({});

globalStyle(
  `:where(${legend} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(1.5),
  }),
);

export const alertMetricChartStyles = {
  placeholder: style([
    shared.row.base,
    utility({
      height: '200px',
      justifyContent: 'center',
      borderRadius: vars.radius.md,
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: vars.color.line.DEFAULT,
      backgroundColor: vars.color.surface.card,
      paddingInline: space(4),
    }),
  ]),
  error: style([shared.textCenter, shared.text.sm, shared.fg.critical]),
  // Italic once it is known there is nothing to show.
  status: recipe({
    base: [shared.text.sm, shared.fg.subtle],
    variants: {
      loading: {
        false: utility({ fontStyle: 'italic' }),
      },
    },
  }),
  legend,
  legendRow: style([
    shared.row.base,
    shared.text.control,
    shared.fg.secondary,
    utility({
      flexWrap: 'wrap',
      columnGap: space(2),
    }),
  ]),
  legendNote: style(utility({ fontStyle: 'italic' })),
};
