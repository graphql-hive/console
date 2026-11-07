import { globalStyle, style } from '@vanilla-extract/css';
import { component } from '../../styles/layered';
import { space } from '../../styles/space';
import * as shared from '../../styles/shared.css';
import { vars } from '../../styles/theme.css';

const subPage = style({});

globalStyle(
  `:where(${subPage} > :not(:last-child))`,
  component({
    marginBlockStart: '0',
    marginBlockEnd: space(2),
  }),
);

const subPageHeading = style(component({ maxWidth: '600px' }));

globalStyle(
  `:where(${subPageHeading} > :not(:last-child))`,
  component({
    marginBlockStart: '0',
    marginBlockEnd: space(2),
  }),
);

export const pageContentLayoutStyles = {
  root: style([shared.stack.base, component({ rowGap: space(4) })]),
  row: style(
    component({
      display: 'flex',
      flexDirection: 'row',
      columnGap: space(6),
      paddingBlock: space(6),
    }),
  ),
  content: style(component({ flexGrow: '1' })),
  title: style([shared.text['2xl'], shared.weight.semibold, component({ marginBottom: space(2) })]),
  rule: style(
    component({
      marginBottom: space(3),
      height: '1px',
      width: '100%',
      backgroundColor: vars.color.line.subtle,
    }),
  ),
  subPage,
  subPageHeader: style(component({ marginBottom: space(6) })),
  subPageHeaderSplit: style([
    shared.flex,
    shared.fullWidth,
    component({ justifyContent: 'space-between' }),
  ]),
  subPageHeading,
  subPageTitle: style([shared.text.lg, shared.weight.medium, shared.fg.strong]),
  subPageSide: style(
    component({
      display: 'flex',
      gap: space(4),
    }),
  ),
};
