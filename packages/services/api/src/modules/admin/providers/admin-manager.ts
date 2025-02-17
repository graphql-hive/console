import { GraphQLError } from 'graphql';
import { Injectable, Scope } from 'graphql-modules';
import { atomic } from '../../../shared/helpers';
import { Session } from '../../auth/lib/authz';
import { OperationsReader } from '../../operations/providers/operations-reader';
import { Logger } from '../../shared/providers/logger';
import { Storage } from '../../shared/providers/storage';

/**
 * Responsible for auth checks.
 * Talks to Storage.
 */
@Injectable({
  scope: Scope.Operation,
})
export class AdminManager {
  private logger: Logger;

  constructor(
    logger: Logger,
    private storage: Storage,
    private session: Session,
    private operationsReader: OperationsReader,
  ) {
    this.logger = logger.child({ source: 'AdminManager' });
  }

  async getStats(period: { from: Date; to: Date }) {
    this.logger.debug('Fetching admin stats');
    const user = await this.session.getViewer();

    if (!user.isAdmin) {
      throw new GraphQLError('GO AWAY');
    }

    return this.storage.adminGetStats(period);
  }

  async getOperationsOverTime({
    period,
    resolution,
  }: {
    period: {
      from: Date;
      to: Date;
    };
    resolution: number;
  }) {
    this.logger.debug(
      'Fetching collected operations over time (admin, from=%s, to=%s, resolution=%s)',
      period.from,
      period.to,
      resolution,
    );
    const user = await this.session.getViewer();

    if (!user.isAdmin) {
      throw new GraphQLError('GO AWAY');
    }

    const points = await this.operationsReader.adminOperationsOverTime({
      period,
      resolution,
    });

    return points.map(point => ({
      date: point.date,
      count: point.total,
    }));
  }

  @atomic((arg: { daysLimit: number }) => String(arg.daysLimit))
  async countOperationsPerOrganization({ period }: { period: { from: Date; to: Date } }) {
    this.logger.info(
      'Counting collected operations per organization (admin, from=%s, to=%s)',
      period.from,
      period.to,
    );
    const user = await this.session.getViewer();

    if (user.isAdmin) {
      const pairs = await this.storage.adminGetOrganizationsTargetPairs();
      const operations = await this.operationsReader.adminCountOperationsPerTarget({
        period,
      });

      const organizationCountMap = new Map<string, number>();
      const targetOrganizationMap = new Map<string, string>(
        pairs.map(p => [p.target, p.organization]),
      );

      for (const op of operations) {
        const organizationId = targetOrganizationMap.get(op.target);

        if (organizationId) {
          const total = organizationCountMap.get(organizationId);
          organizationCountMap.set(organizationId, (total ?? 0) + op.total);
        }
      }

      return Array.from(organizationCountMap.entries()).map(entry => ({
        organization: entry[0],
        total: entry[1],
      }));
    }

    throw new GraphQLError('Go away');
  }
}
