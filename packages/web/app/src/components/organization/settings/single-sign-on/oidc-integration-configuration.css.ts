import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { utility } from '../../../../styles/layered';
import { space } from '../../../../styles/space';
import * as shared from '../../../../styles/shared.css';
import { vars } from '../../../../styles/theme.css';

const spacedBlock = (gap: number, rule = {}) => {
  const root = style(utility(rule));
  globalStyle(
    `:where(${root} > :not(:last-child))`,
    utility({
      marginBlockStart: '0',
      marginBlockEnd: space(gap),
    }),
  );
  return root;
};

const spacedRow = (rule: Parameters<typeof utility>[0]) => {
  const root = style(utility(rule));
  globalStyle(
    `:where(${root} > :not(:last-child))`,
    utility({
      marginInlineStart: '0',
      marginInlineEnd: space(4),
    }),
  );
  return root;
};

const settingHint = style([
  shared.weight.normal,
  shared.fg.secondary,
  utility({
    fontSize: vars.text.xs,
    lineHeight: vars.leading.snug,
  }),
]);

// Only an admin may change the default role; the block reads as locked for everyone else.
const defaultRole = spacedBlock(1, {
  fontSize: vars.text.sm,
  lineHeight: '1',
  fontWeight: vars.weight.medium,
});

export const oidcIntegrationConfigurationStyles = {
  root: spacedBlock(10),
  section: spacedBlock(2),
  sectionHeader: style(
    utility({
      display: 'flex',
      justifyContent: 'space-between',
    }),
  ),
  domains: spacedBlock(4),
  // A setting: its text on the left, the control on the right.
  setting: spacedRow({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }),
  settingText: spacedBlock(1, {
    display: 'flex',
    flexDirection: 'column',
    fontSize: vars.text.sm,
    lineHeight: '1',
    fontWeight: vars.weight.medium,
  }),
  settingHint,
  settingHintNarrow: style([settingHint, utility({ maxWidth: '500px' })]),
  domainHint: style(
    utility({
      maxWidth: '500px',
      fontSize: vars.text.xs,
      lineHeight: vars.leading.snug,
      fontWeight: vars.weight.normal,
    }),
  ),
  provisioning: spacedBlock(4, {
    marginTop: space(2),
    borderRadius: vars.radius.lg,
    borderStyle: 'solid',
    borderWidth: '1px',
    padding: space(6),
  }),
  settings: spacedBlock(5),
  link: style(
    utility({
      display: 'inline-flex',
      alignItems: 'center',
      gap: space(1),
      color: vars.color.accent.DEFAULT,
      '@media': {
        '(hover: hover)': {
          selectors: {
            '&:hover': { color: vars.color.accent.muted },
          },
        },
      },
    }),
  ),
  conflicts: style([shared.flex, shared.text.xs, shared.fg.warning]),
  conflictsPopover: spacedBlock(2, {
    fontSize: vars.text.sm,
    lineHeight: vars.text.smLineHeight,
    color: vars.color.fg.default,
  }),
  defaultRole: recipe({
    base: [defaultRole],
    variants: {
      locked: {
        true: utility({ cursor: 'not-allowed' }),
      },
    },
  }),
  defaultRoleRow: spacedRow({
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  }),
  defaultRoleText: style([
    shared.stack.base,
    utility({
      flexBasis: '66.666667%',
      '@media': {
        '(width >= 48rem)': { flexBasis: '50%' },
      },
    }),
  ]),
  defaultRoleSelect: style(
    utility({
      display: 'flex',
      minWidth: '150px',
      flexBasis: '33.333333%',
      '@media': {
        '(width >= 48rem)': { flexBasis: '50%' },
      },
    }),
  ),
  defaultResources: style(utility({ marginTop: space(2) })),
};
