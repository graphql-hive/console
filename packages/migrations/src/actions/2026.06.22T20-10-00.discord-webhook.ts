import { type MigrationExecutor } from '../pg-migrator';

export default {
  name: '2026.06.22T20-10-00.discord-webhook.ts',
  run: ({ psql }) => psql`
    ALTER TYPE alert_channel_type ADD VALUE IF NOT EXISTS 'DISCORD_WEBHOOK';
  `,
} satisfies MigrationExecutor;
