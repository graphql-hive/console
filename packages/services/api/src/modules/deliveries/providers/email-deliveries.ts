import { Injectable, Scope } from 'graphql-modules';
import type { DateRange, OrganizationInvitation } from '../../../shared/entities';
import { AccessError } from '../../../shared/errors';
import { batchBy } from '../../../shared/helpers';
import { Session } from '../../auth/lib/authz';
import { Logger } from '../../shared/providers/logger';
import { Storage } from '../../shared/providers/storage';
import {
  DeliveryReader,
  EMAIL_DELIVERY_EVENT_NAMES,
  type Delivery,
  type DeliverySelector,
  type EmailDeliveryEventName,
  type LastOutcomes,
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

type EventGate = 'member:modify' | 'auditLog:export' | 'billing:describe' | 'owner';

/**
 * What lets a viewer see each kind of email: the permission of the feature that sends it, or
 * owning the organization for the transfers only the owner can request.
 */
const EVENT_GATE = {
  ORGANIZATION_INVITATION: 'member:modify',
  ORGANIZATION_OWNERSHIP_TRANSFER: 'owner',
  AUDIT_LOG_EXPORT: 'auditLog:export',
  USAGE_RATE_LIMIT_WARNING: 'billing:describe',
  USAGE_RATE_LIMIT_EXCEEDED: 'billing:describe',
} satisfies Record<EmailDeliveryEventName, EventGate>;

/**
 * Reads an organization's email deliveries: the kinds the viewer may see, and the ones behind
 * its invitations.
 */
@Injectable({ scope: Scope.Operation })
export class EmailDeliveries {
  private logger: Logger;
  /** Per organization, decided once per request: the fields of one query share it. */
  private visibleEventsCache = new Map<string, Promise<EmailDeliveryEventName[]>>();

  constructor(
    private reader: DeliveryReader,
    private session: Session,
    private storage: Storage,
    logger: Logger,
  ) {
    this.logger = logger.child({ source: 'EmailDeliveries' });
  }

  /**
   * The organization's email deliveries this viewer may read: the kinds whose feature they may
   * manage. Throws when there is no such kind.
   */
  async readableSelector(organizationId: string): Promise<DeliverySelector> {
    this.logger.debug('Fetching email deliveries (organization=%s)', organizationId);
    const events = await this.visibleEvents(organizationId);
    if (events.length === 0) {
      throw new AccessError(
        `Insufficient permissions. Either 'member:modify', 'auditLog:export' or 'billing:describe', or organization ownership, is required to read email deliveries.`,
      );
    }
    return { ...emailDeliverySelector(organizationId), events };
  }

  /** Whether the viewer may see at least one kind of email. */
  async canRead(organizationId: string): Promise<boolean> {
    const events = await this.visibleEvents(organizationId);
    return events.length > 0;
  }

  /** Only the timestamps hold across recipients; the status and streak describe one destination. */
  async getHealth(organizationId: string): Promise<LastOutcomes> {
    const selector = await this.readableSelector(organizationId);
    return this.reader.getLastOutcomes(selector);
  }

  async getLog(input: {
    organizationId: string;
    period: DateRange;
    limit?: number;
  }): Promise<Delivery[]> {
    const selector = await this.readableSelector(input.organizationId);
    return this.reader.getLog({ ...selector, period: input.period, limit: input.limit });
  }

  /** The kinds of email the viewer may see, in the order of EMAIL_DELIVERY_EVENT_NAMES. */
  private visibleEvents(organizationId: string): Promise<EmailDeliveryEventName[]> {
    let events = this.visibleEventsCache.get(organizationId);
    if (!events) {
      events = this.decideVisibleEvents(organizationId);
      this.visibleEventsCache.set(organizationId, events);
    }
    return events;
  }

  private async decideVisibleEvents(organizationId: string): Promise<EmailDeliveryEventName[]> {
    const gates = [...new Set(Object.values(EVENT_GATE))];
    const passed = await Promise.all(gates.map(gate => this.passes(gate, organizationId)));
    const open = new Set(gates.filter((_, index) => passed[index]));
    return EMAIL_DELIVERY_EVENT_NAMES.filter(event => open.has(EVENT_GATE[event]));
  }

  private async passes(gate: EventGate, organizationId: string): Promise<boolean> {
    if (gate === 'owner') {
      const actor = await this.session.getActor();
      if (actor.type !== 'user') {
        return false;
      }
      const ownerId = await this.storage.getOrganizationOwnerId({ organizationId });
      return actor.user.id === ownerId;
    }
    return this.session.canPerformAction({
      action: gate,
      organizationId,
      params: { organizationId },
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
function emailDeliverySelector(organizationId: string): DeliverySelector {
  return { organizationId, deliveryType: 'EMAIL' };
}
