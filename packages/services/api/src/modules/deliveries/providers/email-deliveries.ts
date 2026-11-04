import { Injectable, Scope } from 'graphql-modules';
import type { OrganizationInvitation } from '../../../shared/entities';
import { batchBy } from '../../../shared/helpers';
import { Logger } from '../../shared/providers/logger';
import { DeliveryReader, type Delivery } from './delivery-reader';

/** Recipients one lookup covers: the invitations page is at most this long. */
const INVITATION_BATCH_SIZE = 50;

/** Reads the email deliveries behind an organization's invitations. */
@Injectable({ scope: Scope.Operation })
export class EmailDeliveries {
  private logger: Logger;

  constructor(
    private reader: DeliveryReader,
    logger: Logger,
  ) {
    this.logger = logger.child({ source: 'EmailDeliveries' });
  }

  /**
   * The most recent attempt to email an invitation: null before one is recorded, or when the
   * history could not be read. The invitations resolved in one tick share one query per
   * organization. An attempt older than the invitation belongs to an earlier invitation of the
   * same address and does not count.
   */
  getLatestInvitationDelivery = batchBy<OrganizationInvitation, Delivery | null>(
    invitation => invitation.organizationId,
    async invitations => {
      const organizationId = invitations[0].organizationId;
      const createdAt = invitations.map(invitation => toSeconds(invitation.createdAt));

      let latest: Map<string, Delivery>;
      try {
        latest = await this.reader.getLatestByDestination({
          organizationId,
          deliveryType: 'EMAIL',
          event: 'organization_invitation',
          destinations: invitations.map(invitation => invitation.email),
          since: new Date(Math.min(...createdAt) * 1000),
        });
      } catch (error) {
        this.logger.error(
          'Failed to read invitation deliveries (organization=%s, error=%s)',
          organizationId,
          error instanceof Error ? error.message : String(error),
        );
        return invitations.map(() => null);
      }

      return invitations.map((invitation, index) => {
        const delivery = latest.get(invitation.email.toLowerCase()) ?? null;
        return delivery && toSeconds(delivery.timestamp) >= createdAt[index] ? delivery : null;
      });
    },
    INVITATION_BATCH_SIZE,
  );
}

/** Recorded timestamps have second precision; the invitation's creation is compared at that precision. */
function toSeconds(value: Date | string): number {
  return Math.floor(new Date(value).getTime() / 1000);
}
