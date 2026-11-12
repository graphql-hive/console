import { Injectable, Scope } from 'graphql-modules';
import * as zod from 'zod';
import { PostgresDatabasePool, psql } from '@hive/postgres';
import type { AlertChannel } from '../../../shared/entities';
import { isUUID } from '../../../shared/is-uuid';

/** An `alert_channels` row selected as the `AlertChannel` entity. */
export const AlertChannelRowSchema = zod.object({
  id: zod.string(),
  projectId: zod.string(),
  type: zod.enum(['SLACK', 'WEBHOOK', 'MSTEAMS_WEBHOOK', 'DISCORD']),
  name: zod.string(),
  createdAt: zod.string(),
  slackChannel: zod.string().nullable(),
  webhookEndpoint: zod.string().nullable(),
  disabledAt: zod.string().nullable(),
  disabledByUserId: zod.string().nullable(),
  enabledAt: zod.string(),
});

const AlertChannelWithOrganizationModel = AlertChannelRowSchema.extend({
  organizationId: zod.string(),
});

/** A channel with the organization it belongs to, which the entity itself does not carry. */
export type AlertChannelWithOrganization = AlertChannel & { organizationId: string };

@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class AlertChannelsStorage {
  constructor(private pool: PostgresDatabasePool) {}

  /** Null when no channel has the id. */
  async getAlertChannelById(channelId: string): Promise<AlertChannelWithOrganization | null> {
    // Postgres rejects a malformed uuid; treat it as not found.
    if (!isUUID(channelId)) {
      return null;
    }
    const row = await this.pool.maybeOne(psql`/* getAlertChannelById */
      SELECT
        c."id" AS "id",
        c."name" AS "name",
        c."type" AS "type",
        c."project_id" AS "projectId",
        to_json(c."created_at") AS "createdAt",
        c."slack_channel" AS "slackChannel",
        c."webhook_endpoint" AS "webhookEndpoint",
        to_json(c."disabled_at") AS "disabledAt",
        c."disabled_by_user_id" AS "disabledByUserId",
        to_json(c."enabled_at") AS "enabledAt",
        p."org_id" AS "organizationId"
      FROM "alert_channels" c
      INNER JOIN "projects" p ON p."id" = c."project_id"
      WHERE c."id" = ${channelId}
    `);
    return row ? AlertChannelWithOrganizationModel.parse(row) : null;
  }
}
