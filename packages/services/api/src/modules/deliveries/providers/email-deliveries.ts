import { Injectable, Scope } from 'graphql-modules';
import type { DateRange, OrganizationInvitation } from '../../../shared/entities';
import { batchBy } from '../../../shared/helpers';
import { Session } from '../../auth/lib/authz';
import { Logger } from '../../shared/providers/logger';
import {
  DeliveryReader,
  type Delivery,
  type DeliveryHealth,
  type DeliverySelector,
} from './delivery-reader';

/** Recipients one lookup covers: the invitations page is at most this long. */
const INVITATION_BATCH_SIZE = 50;

/**
 * The idempotency key of the email inviting someone. The API hands it to the workflows
 * `organizationInvitation` job when it schedules it, the job records it with every attempt, and
 * the invitation's status is read back by it. Inviting an address again deletes and re-creates
 * the invitation while the first job may still be retrying; the creation time keeps the two apart.
 */
export function invitationDeliveryKey(
  invitation: Pick<OrganizationInvitation, 'email' | 'createdAt'>,
): string {
  return `organization-invitation:${invitation.createdAt}:${invitation.email}`;
}

/** Reads an organization's email deliveries: its page of them, and the ones behind its invitations. */
@Injectable({ scope: Scope.Operation })
export class EmailDeliveries {
  private logger: Logger;

  constructor(
    private reader: DeliveryReader,
    private session: Session,
    logger: Logger,
  ) {
    this.logger = logger.child({ source: 'EmailDeliveries' });
  }

  /** Reading an organization's email deliveries takes member:modify, like its invitations. */
  async assertCanRead(organizationId: string): Promise<void> {
    this.logger.debug('Fetching email deliveries (organization=%s)', organizationId);
    await this.session.assertPerformAction({
      action: 'member:modify',
      organizationId,
      params: { organizationId },
    });
  }

  canRead(organizationId: string): Promise<boolean> {
    return this.session.canPerformAction({
      action: 'member:modify',
      organizationId,
      params: { organizationId },
    });
  }

  async getHealth(organizationId: string): Promise<DeliveryHealth> {
    await this.assertCanRead(organizationId);
    return this.reader.getHealth(emailDeliverySelector(organizationId));
  }

  async getLog(input: {
    organizationId: string;
    period: DateRange;
    limit?: number;
  }): Promise<Delivery[]> {
    await this.assertCanRead(input.organizationId);
    return this.reader.getLog({
      ...emailDeliverySelector(input.organizationId),
      period: input.period,
      limit: input.limit,
    });
  }

  /**
   * The most recent attempt to email an invitation: null before one is recorded, or when the
   * history could not be read. The invitations resolved in one tick share one query per
   * organization. Only the attempts under this invitation's key count, so the retries of an
   * earlier invitation of the same address are not shown as this one's status.
   */
  getLatestInvitationDelivery = batchBy<OrganizationInvitation, Delivery | null>(
    invitation => invitation.organizationId,
    async invitations => {
      const organizationId = invitations[0].organizationId;
      const keys = invitations.map(invitationDeliveryKey);

      let latest: Map<string, Delivery>;
      try {
        latest = await this.reader.getLatestByKey({
          ...emailDeliverySelector(organizationId),
          keys,
          since: new Date(
            Math.min(...invitations.map(invitation => new Date(invitation.createdAt).getTime())),
          ),
        });
      } catch (error) {
        this.logger.error(
          'Failed to read invitation deliveries (organization=%s, error=%s)',
          organizationId,
          error instanceof Error ? error.message : String(error),
        );
        return invitations.map(() => null);
      }

      return keys.map(key => latest.get(key) ?? null);
    },
    INVITATION_BATCH_SIZE,
  );
}

/** Every email delivery of the organization: the key prefix the reader needs. */
export function emailDeliverySelector(organizationId: string): DeliverySelector {
  return { organizationId, deliveryType: 'EMAIL' };
}
