import { globalStyle, style, styleVariants } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../styles/layered';
import { space, square } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const usageBreakdown = style(
  utility({
    marginTop: space(4),
    textAlign: 'left',
  }),
);

globalStyle(
  `:where(${usageBreakdown} > :not(:last-child))`,
  utility({
    marginBlockStart: '0',
    marginBlockEnd: space(1),
  }),
);

const underlineOnHover = (offset: string) => ({
  '@media': {
    '(hover: hover)': {
      selectors: {
        '&:hover': {
          textDecorationLine: 'underline',
          textUnderlineOffset: offset,
        },
      },
    },
  },
});

const row = (gap?: number) =>
  style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      ...(gap ? { gap: space(gap) } : {}),
    }),
  );

const popoverHeading = style([
  shared.text.lg,
  shared.weight.medium,
  utility({ marginBottom: space(1) }),
]);

const smallLink = style(
  utility({
    fontSize: vars.text.xs,
    lineHeight: vars.text.xsLineHeight,
    fontWeight: vars.weight.normal,
    ...underlineOnHover('2px'),
  }),
);

const skeletonIcon = style([shared.icon.md, utility({ marginBlock: space(1), display: 'block' })]);

export const explorerCommonStyles = {
  // Hidden when the user turns descriptions off.
  description: recipe({
    base: utility({
      marginTop: '0px',
      marginBottom: space(2),
      display: 'block',
      maxWidth: vars.breakpoint.sm,
    }),
    variants: {
      hidden: { true: utility({ display: 'none' }) },
    },
  }),
  descriptionText: style(
    utility({
      textAlign: 'left',
      fontSize: vars.text.sm,
      lineHeight: vars.text.smLineHeight,
      color: vars.color.fg.secondary,
    }),
  ),
  usage: style([
    shared.flex,
    shared.text.xs,
    utility({
      marginLeft: space(3),
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(2),
    }),
  ]),
  usageTotal: style(
    utility({
      minWidth: '25px',
      textAlign: 'center',
    }),
  ),
  usageCell: style(utility({ minWidth: '25px' })),
  usageTrigger: style(
    utility({
      display: 'block',
      width: '100%',
      cursor: 'help',
    }),
  ),
  usagePopover: style(utility({ textAlign: 'left' })),
  usagePopoverTitle: style([
    shared.text.lg,
    shared.weight.bold,
    utility({ marginBottom: space(1) }),
  ]),
  usagePopoverBody: style(utility({ maxWidth: space(60) })),
  usageBreakdown,
  activityButton: style([shared.text.xl, utility({ cursor: 'help' })]),
  activityIcon: style(
    utility({
      height: space(6),
      width: 'auto',
    }),
  ),
  popoverHeading,
  emphasis: style([shared.weight.medium, shared.fg.strong]),
  popoverFooter: style(utility({ marginTop: space(4) })),
  clientsButton: style([shared.text.xl, utility({ cursor: 'help', padding: space(1) })]),
  clientsIcon: style(utility(square(4))),
  clientsNote: style(utility({ marginBottom: space(2) })),
  clientsLink: style(utility({ color: vars.color.warning.DEFAULT, ...underlineOnHover('2px') })),
  deprecation: style(utility({ marginBottom: space(2) })),
  deprecationText: style(utility({ color: vars.color.fg.secondary })),
  card: style(
    utility({
      borderRadius: vars.radius.md,
      borderStyle: 'solid',
      borderWidth: '2px',
      borderColor: vars.color.line.DEFAULT,
    }),
  ),
  cardHeader: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: space(4),
    }),
  ),
  cardTitle: row(2),
  cardKind: style([shared.weight.normal, shared.fg.secondary]),
  cardImplements: style([
    shared.flex,
    shared.text.sm,
    shared.fg.secondary,
    utility({
      flexDirection: 'row',
      alignItems: 'center',
    }),
  ]),
  cardImplementsLabel: style(utility({ marginInline: space(2) })),
  cardImplementsList: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      gap: space(2),
    }),
  ),
  // Every other row is striped.
  listItem: recipe({
    base: utility({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: space(4),
      fontSize: vars.text.sm,
      lineHeight: vars.text.smLineHeight,
    }),
    variants: {
      striped: { true: utility({ backgroundColor: vars.color.surface.stripe }) },
    },
  }),
  empty: style([
    shared.textCenter,
    shared.text.sm,
    shared.fg.secondary,
    utility({
      borderRadius: vars.radius.md,
      borderWidth: '1px',
      borderStyle: 'dashed',
      borderColor: vars.color.line.DEFAULT,
      paddingInline: space(4),
      paddingBlock: space(8),
    }),
  ]),
  inputField: style([
    shared.flex,
    shared.fullWidth,
    utility({
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    }),
  ]),
  inputFieldName: style(
    utility({
      fontWeight: vars.weight.semibold,
      color: vars.color.fg.DEFAULT,
    }),
  ),
  colon: style(utility({ marginRight: space(1) })),
  inputFieldType: style(utility({ fontWeight: vars.weight.semibold })),
  typeLink: style(utility(underlineOnHover('4px'))),
  typeLinkPopover: style([shared.stack.base, utility({ rowGap: space(2) })]),
  typeLinkAction: smallLink,
  typeLinkHint: style([shared.text.xs, shared.fg.secondary]),
  link: style(utility(underlineOnHover('2px'))),
  fieldsSkeleton: style([shared.stack.base, shared.fullWidth]),
  fieldsSkeletonItem: style(utility({ width: '100%' })),
  fieldsSkeletonRow: style([
    shared.flex,
    shared.fullWidth,
    utility({
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(2),
    }),
  ]),
  fieldsSkeletonName: style(
    utility({
      marginBlock: space(1),
      display: 'flex',
    }),
  ),
  fieldsSkeletonActions: style(
    utility({
      marginLeft: 'auto',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(2),
    }),
  ),
  skeletonIcon,
  cardSkeleton: style(
    utility({
      borderRadius: vars.radius.md,
      borderStyle: 'solid',
      borderWidth: '2px',
      borderColor: vars.color.line.subtle,
    }),
  ),
  cardSkeletonHeader: style(
    utility({
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: space(4),
    }),
  ),
  cardSkeletonTitle: row(2),
  cardSkeletonName: style(
    utility({
      marginBlock: space(1),
      display: 'flex',
      width: space(32),
    }),
  ),
  // A placeholder line's width, in spacing steps.
  skeletonWidth: styleVariants({
    32: utility({ width: space(32) }),
    48: utility({ width: space(48) }),
    64: utility({ width: space(64) }),
    96: utility({ width: space(96) }),
  }),
};
