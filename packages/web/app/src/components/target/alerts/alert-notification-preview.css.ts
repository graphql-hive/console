import { globalStyle, style, styleVariants } from '@vanilla-extract/css';
import { utility } from '../../../styles/layered';
import { space } from '../../../styles/space';
import * as shared from '../../../styles/shared.css';
import { vars } from '../../../styles/theme.css';

const spaced = (gap: number, rule = {}) => {
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

// Each destination renders a mock of its own message. The parts they share are defined once.
const label = style([
  shared.text.xs,
  shared.weight.medium,
  shared.fg.secondary,
  utility({ marginBottom: space(2) }),
]);

const card = {
  borderRadius: vars.radius.md,
  borderStyle: 'solid',
  borderWidth: '1px',
  borderColor: vars.color.line.DEFAULT,
  backgroundColor: vars.color.surface.card,
} as const;

const messageTitle = style([shared.weight.bold, shared.fg.strong]);

const fieldLabel = style(
  utility({
    width: space(20),
    color: vars.color.fg.secondary,
  }),
);

const link = style([shared.text.sm, shared.fg.accent, utility({ marginTop: space(2) })]);

export const alertNotificationPreviewStyles = {
  // The destination's colour for the severity.
  severityBar: styleVariants({
    critical: utility({ backgroundColor: vars.color.critical.DEFAULT }),
    warning: utility({ backgroundColor: vars.color.warning.DEFAULT }),
    info: utility({ backgroundColor: vars.color.info.DEFAULT }),
  }),
  severityText: styleVariants({
    critical: utility({ color: vars.color.critical.DEFAULT }),
    warning: utility({ color: vars.color.warning.DEFAULT }),
    info: utility({ color: vars.color.info.DEFAULT }),
  }),
  slack: spaced(1),
  slackLabel: label,
  slackCard: style(utility({ ...card, padding: space(3) })),
  slackHeader: style([shared.row.gap2, utility({ marginBottom: space(2) })]),
  slackAvatar: style([
    shared.row.base,
    shared.icon.lg,
    shared.text['2xs'],
    shared.weight.bold,
    shared.fg.accent,
    utility({
      justifyContent: 'center',
      borderRadius: vars.radius.sm,
      backgroundColor: vars.color.accent.DEFAULT,
    }),
  ]),
  slackSender: style([shared.text.sm, shared.weight.bold, shared.fg.strong]),
  slackBadge: style([shared.text.xs, shared.fg.subtle]),
  slackBar: style(
    utility({
      width: space(1),
      flexShrink: '0',
      borderTopLeftRadius: vars.radius.DEFAULT,
      borderBottomLeftRadius: vars.radius.DEFAULT,
    }),
  ),
  slackMessage: style(
    utility({
      borderTopRightRadius: vars.radius.DEFAULT,
      borderBottomRightRadius: vars.radius.DEFAULT,
      backgroundColor: vars.color.surface.card,
      padding: space(3),
      fontSize: vars.text.sm,
      lineHeight: vars.leading.relaxed,
    }),
  ),
  slackTitle: messageTitle,
  slackLine: style(
    utility({
      marginTop: space(1),
      color: vars.color.fg.secondary,
    }),
  ),
  slackCode: style([
    shared.text.xs,
    utility({
      borderRadius: vars.radius.sm,
      backgroundColor: vars.color.surface.code,
      paddingInline: space(1),
    }),
  ]),
  slackLink: style(
    utility({
      marginTop: space(1),
      color: vars.color.accent.DEFAULT,
    }),
  ),
  webhook: spaced(3),
  webhookLabel: label,
  webhookCard: style(utility({ ...card, padding: space(3) })),
  webhookPayload: style(
    utility({
      fontSize: vars.text.xs,
      lineHeight: vars.leading.relaxed,
      color: vars.color.fg.default,
    }),
  ),
  teams: spaced(1),
  teamsLabel: label,
  teamsCard: style(utility({ ...card, overflow: 'hidden' })),
  teamsBar: style(utility({ height: space(1) })),
  teamsBody: style(utility({ padding: space(3) })),
  teamsTitle: messageTitle,
  teamsFields: spaced(1, {
    marginTop: space(2),
    fontSize: vars.text.sm,
    lineHeight: vars.text.smLineHeight,
  }),
  teamsFieldLabel: fieldLabel,
  teamsLink: link,
  discord: spaced(1),
  discordLabel: label,
  discordCard: style(utility({ ...card, display: 'flex', overflow: 'hidden' })),
  discordBar: style(
    utility({
      width: space(1),
      flexShrink: '0',
    }),
  ),
  discordBody: style(utility({ padding: space(3) })),
  discordTitle: messageTitle,
  discordDescription: style([
    shared.text.sm,
    shared.fg.secondary,
    utility({ marginTop: space(2) }),
  ]),
  discordFields: spaced(1, {
    marginTop: space(3),
    fontSize: vars.text.sm,
    lineHeight: vars.text.smLineHeight,
  }),
  discordFieldLabel: fieldLabel,
  discordLink: link,
  empty: style([shared.text.sm, shared.fg.subtle, utility({ fontStyle: 'italic' })]),
  root: spaced(2),
  note: style([shared.text.xs, shared.fg.subtle]),
};
